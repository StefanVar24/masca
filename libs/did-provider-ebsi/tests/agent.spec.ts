import * as fs from 'fs';
import {
  createAgent,
  type IAgentOptions,
  type ICredentialPlugin,
  type IDIDManager,
  type IDataStore,
  type IDataStoreORM,
  type IKeyManager,
  type IResolver,
  type TAgent,
} from '@veramo/core';
import { CredentialPlugin } from '@veramo/credential-w3c';
import {
  DIDStore,
  Entities,
  KeyStore,
  PrivateKeyStore,
  migrations,
} from '@veramo/data-store';
import { DIDManager } from '@veramo/did-manager';
import { DIDResolverPlugin } from '@veramo/did-resolver';
import { KeyManager } from '@veramo/key-manager';
import { KeyManagementSystem, SecretBox } from '@veramo/kms-local';
import { Resolver } from 'did-resolver';
import { DataSource, type DataSourceOptions } from 'typeorm';

import {
  EbsiDIDProvider,
  ebsiDidResolver as getDidEbsiResolver,
} from '../src/index';
import plugin from './plugin.js';

jest.setTimeout(60000);

const KMS_SECRET_KEY =
  '29739248cad1bd1a0fc4d9b75cd4d2990de535baf5caadfdf8d8f86664aa830c';

let agent: TAgent<
  IDIDManager &
    IKeyManager &
    IDataStore &
    IDataStoreORM &
    IResolver &
    ICredentialPlugin
>;
let dbConnection: Promise<DataSource>;
let databaseFile: string;

// eslint-disable-next-line @typescript-eslint/require-await
const setup = async (options?: IAgentOptions): Promise<boolean> => {
  databaseFile = options?.context?.databaseFile || ':memory:';
  dbConnection = new DataSource({
    name: options?.context?.dbName || 'test',
    type: 'sqlite',
    database: databaseFile,
    synchronize: false,
    migrations,
    migrationsRun: true,
    logging: false,
    entities: Entities,
    ...options?.context?.dbConnectionOptions,
  } as DataSourceOptions).initialize();

  agent = createAgent<
    IDIDManager &
      IKeyManager &
      IDataStore &
      IDataStoreORM &
      IResolver &
      ICredentialPlugin
  >({
    plugins: [
      new KeyManager({
        store: new KeyStore(dbConnection),
        kms: {
          local: new KeyManagementSystem(
            new PrivateKeyStore(dbConnection, new SecretBox(KMS_SECRET_KEY))
          ),
        },
      }),
      new DIDManager({
        store: new DIDStore(dbConnection),
        defaultProvider: 'did:ebsi:',
        providers: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          'did:ebsi': new EbsiDIDProvider({
            defaultKms: 'local',
          } as { defaultKms: string }),
        },
      }),
      new DIDResolverPlugin({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        resolver: new Resolver({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          ...getDidEbsiResolver(),
        }),
      }),
      new CredentialPlugin(),
    ],
  });
  return true;
};

const tearDown = async (): Promise<boolean> => {
  try {
    await (await dbConnection).dropDatabase();
    await (await dbConnection).destroy();
  } catch (e) {
    // nop
  }
  try {
    fs.unlinkSync(databaseFile);
  } catch (e) {
    // nop
  }
  return true;
};

const getAgent = () => agent;

const testContext = { getAgent, setup, tearDown };

describe('masca/libs: Veramo Agent Tests', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  plugin(testContext);
});
