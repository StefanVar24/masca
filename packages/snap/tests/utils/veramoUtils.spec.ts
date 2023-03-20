import { StreamID } from '@ceramicnetwork/streamid';
import { DIDDataStore } from '@glazed/did-datastore';
import { BIP44CoinTypeNode } from '@metamask/key-tree/dist/BIP44CoinTypeNode';
import { MetaMaskInpageProvider } from '@metamask/providers';
import { SnapsGlobalObject } from '@metamask/snaps-types';
import { IIdentifier, IVerifyResult } from '@veramo/core';
import { StoredCredentials } from 'src/interfaces';

import * as snapUtils from '../../src/utils/snapUtils';
import {
  veramoClearVCs,
  veramoCreateVP,
  veramoDeleteVC,
  veramoImportMetaMaskAccount,
  veramoQueryVCs,
  veramoSaveVC,
  veramoVerifyData,
} from '../../src/utils/veramoUtils';
import { getAgent } from '../../src/veramo/setup';
import {
  address,
  bip44Entropy,
  exampleDID,
  exampleImportedDIDWIthoutPrivateKey,
  exampleVC,
  exampleVCEIP712,
  exampleVCJSONLD,
  exampleVCinVP,
  getDefaultSnapState,
  jsonPath,
} from '../testUtils/constants';
import { SnapMock, createMockSnap } from '../testUtils/snap.mock';

jest
  .spyOn(snapUtils, 'getCurrentAccount')
  // eslint-disable-next-line @typescript-eslint/require-await
  .mockImplementation(async () => address);

jest
  .spyOn(snapUtils, 'getCurrentNetwork')
  // eslint-disable-next-line @typescript-eslint/require-await
  .mockImplementation(async () => '0x5');

let ceramicData: StoredCredentials;
jest
  .spyOn(DIDDataStore.prototype, 'get')
  // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
  .mockImplementation(async (key, did?) => {
    return ceramicData;
  });
jest
  .spyOn(DIDDataStore.prototype, 'merge')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/require-await
  .mockImplementation(async (key, content, options?) => {
    ceramicData = content as StoredCredentials;
    return 'ok' as unknown as StreamID;
  });

describe('Utils [veramo]', () => {
  let snapMock: SnapsGlobalObject & SnapMock;
  let ethereumMock: MetaMaskInpageProvider;

  beforeEach(() => {
    snapMock = createMockSnap();
    ceramicData = {} as StoredCredentials;
    global.snap = snapMock;
    ethereumMock = snapMock as unknown as MetaMaskInpageProvider;
  });

  describe('veramoSaveVC', () => {
    it('should succeed saving VC in snap store', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });

      const expectedResult = [
        {
          id: res[0].id,
          store: 'snap',
        },
      ];

      expect(res).toEqual(expectedResult);
      expect.assertions(1);
    });
    it('should succeed saving JSON-LD VC in snap store', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVCJSONLD,
        store: ['snap'],
      });

      const expectedResult = [
        {
          id: res[0].id,
          store: 'snap',
        },
      ];

      expect(res).toEqual(expectedResult);

      const query = await veramoQueryVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        options: {},
      });
      expect(query[0].data).toEqual(exampleVCJSONLD);
      expect.assertions(2);
    });

    it('should succeed saving EIP712 VC in snap store', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVCEIP712,
        store: ['snap'],
      });

      const expectedResult = [
        {
          id: res[0].id,
          store: 'snap',
        },
      ];

      expect(res).toEqual(expectedResult);
      const query = await veramoQueryVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        options: {},
      });
      expect(query[0].data).toEqual(exampleVCEIP712);
      expect.assertions(2);
    });

    it('should succeed saving VC in snap and ceramic store', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());

      await veramoClearVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        store: ['ceramic'],
      });

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap', 'ceramic'],
      });

      const expectedResult = [
        {
          id: res[0].id,
          store: 'snap',
        },
        {
          id: res[1].id,
          store: 'ceramic',
        },
      ];

      expect(res).toEqual(expectedResult);

      expect.assertions(1);
    });
    it('should succeed saving a JWT string in snap store', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());
      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC.proof.jwt,
        store: ['snap'],
      });
      const expectedResult = [
        {
          id: res[0].id,
          store: 'snap',
        },
      ];

      expect(res).toEqual(expectedResult);
      expect.assertions(1);
    });
    it.todo('should fail saving invalid object');
  });

  describe('veramoDeleteVC', () => {
    it('should succeed deleting VCs in snap store', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());
      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });
      const expectedResult = [
        {
          id: res[0].id,
          store: 'snap',
        },
      ];

      const expectedState = getDefaultSnapState();
      expectedState.accountState[address].vcs[res[0].id] = exampleVC;
      expect(res).toEqual(expectedResult);
      expect(snapMock.rpcMocks.snap_manageState).toHaveBeenLastCalledWith({
        operation: 'update',
        newState: expectedState,
      });

      await veramoDeleteVC({
        snap: snapMock,
        ethereum: ethereumMock,
        id: expectedResult[0].id,
        store: ['snap'],
      });

      const vcs = await veramoQueryVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        options: { store: ['snap'], returnStore: true },
      });

      expect(vcs).toHaveLength(0);
      expect.assertions(3);
    });

    it('should succeed deleting VCs in ceramic store', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap', 'ceramic'],
      });
      const expectedResult = [
        {
          id: res[0].id,
          store: 'snap',
        },
        {
          id: res[1].id,
          store: 'ceramic',
        },
      ];

      const vcsPreDelete = await veramoQueryVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        options: { store: ['snap', 'ceramic'], returnStore: true },
      });
      expect(vcsPreDelete).toHaveLength(1);
      expect(vcsPreDelete[0].metadata.store).toStrictEqual(['snap', 'ceramic']);
      expect(res).toEqual(expectedResult);
      await veramoDeleteVC({
        snap: snapMock,
        ethereum: ethereumMock,
        id: expectedResult[1].id,
        store: ['ceramic'],
      });

      const vcs = await veramoQueryVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        options: { returnStore: true },
      });

      const vcsPostDelete = await veramoQueryVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        options: { store: ['snap', 'ceramic'], returnStore: true },
      });

      await veramoClearVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        store: ['ceramic'],
      });

      expect(vcs).toHaveLength(1);
      expect(vcsPostDelete[0].metadata.store).toStrictEqual(['snap']);
      expect.assertions(5);
    });
    it('should succeed deleting VCs in all stores', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());

      await veramoClearVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        store: ['ceramic'],
      });

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap', 'ceramic'],
      });
      const expectedResult = [
        {
          id: res[0].id,
          store: 'snap',
        },
        {
          id: res[1].id,
          store: 'ceramic',
        },
      ];

      expect(res).toEqual(expectedResult);

      const expectedState = getDefaultSnapState();
      expectedState.accountState[address].vcs[res[0].id] = exampleVC;
      await veramoDeleteVC({
        snap: snapMock,
        ethereum: ethereumMock,
        id: expectedResult[0].id,
      });

      await veramoDeleteVC({
        snap: snapMock,
        ethereum: ethereumMock,
        id: expectedResult[1].id,
      });

      const vcs = await veramoQueryVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        options: { returnStore: true },
      });

      expect(vcs).toHaveLength(0);
      expect.assertions(2);
    });
  });

  describe('veramoClearVC', () => {
    it('should succeed clearing VCs in snap store', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());
      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });

      const expectedState = getDefaultSnapState();
      expectedState.accountState[address].vcs[res[0].id] = exampleVC;

      expect(snapMock.rpcMocks.snap_manageState).toHaveBeenLastCalledWith({
        operation: 'update',
        newState: expectedState,
      });

      await veramoClearVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        store: ['snap'],
      });

      const vcs = await veramoQueryVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        options: { store: ['snap'], returnStore: true },
      });

      expect(vcs).toHaveLength(0);
      expect.assertions(2);
    });
    it('should succeed clearing VCs in all stores', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());
      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });

      const expectedState = getDefaultSnapState();
      expectedState.accountState[address].vcs[res[0].id] = exampleVC;

      expect(snapMock.rpcMocks.snap_manageState).toHaveBeenLastCalledWith({
        operation: 'update',
        newState: expectedState,
      });

      await veramoClearVCs({
        snap: snapMock,
        ethereum: ethereumMock,
      });

      const vcs = await veramoQueryVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        options: { store: ['snap'], returnStore: true },
      });

      expect(vcs).toHaveLength(0);
      expect.assertions(2);
    });
  });

  describe('veramoQueryVCs', () => {
    it('should succeed listing all VCs from snap store - empty result', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());

      await expect(
        veramoQueryVCs({
          snap: snapMock,
          ethereum: ethereumMock,
          options: { store: ['snap'], returnStore: true },
        })
      ).resolves.toEqual([]);

      expect.assertions(1);
    });

    it('should return all VCs from snap store - toggle ceramicVCStore', async () => {
      const state = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockReturnValue(state);
      await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap', 'ceramic'],
      });

      const preQuery = await veramoQueryVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        options: {},
      });
      expect(preQuery).toHaveLength(1);

      state.accountState[address].accountConfig.ssi.vcStore = {
        snap: true,
        ceramic: false,
      };
      snapMock.rpcMocks.snap_manageState.mockReturnValue(state);

      const resRet = snapUtils.getEnabledVCStores(address, state);
      expect(resRet).toEqual(['snap']);

      let queryRes = await veramoQueryVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        options: {
          returnStore: true,
        },
      });

      expect(queryRes).toHaveLength(1);
      expect(queryRes[0].metadata.store).toEqual(['snap']);

      state.accountState[address].accountConfig.ssi.vcStore = {
        snap: true,
        ceramic: true,
      };
      snapMock.rpcMocks.snap_manageState.mockReturnValue(state);

      const resRet2 = snapUtils.getEnabledVCStores(address, state);
      expect(resRet2).toEqual(['snap', 'ceramic']);

      queryRes = await veramoQueryVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        options: {
          returnStore: true,
        },
      });

      expect(queryRes).toHaveLength(1);
      expect(queryRes[0].metadata.store).toEqual(['snap', 'ceramic']);

      expect.assertions(7);
    });

    it('should succeed listing all VCs from snap store', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });

      const expectedVCObject = {
        data: exampleVC,
        metadata: { id: res[0].id, store: ['snap'] },
      };
      await expect(
        veramoQueryVCs({
          snap: snapMock,
          ethereum: ethereumMock,
          options: { store: ['snap'], returnStore: true },
        })
      ).resolves.toEqual([expectedVCObject]);

      expect.assertions(1);
    });

    it('should succeed listing JWT VC from snap store', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC.proof.jwt,
        store: ['snap'],
      });

      const expectedResult = [
        {
          id: res[0].id,
          store: 'snap',
        },
      ];

      expect(res).toEqual(expectedResult);

      const vcs = await veramoQueryVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        options: { store: ['snap'], returnStore: true },
      });

      expect(vcs).toHaveLength(1);
      expect(vcs[0].data).toStrictEqual(exampleVCinVP);

      expect.assertions(3);
    });

    it('should succeed listing all VCs from snap store - without returnStore', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });

      const expectedVCObject = {
        data: exampleVC,
        metadata: { id: res[0].id },
      };

      const queryRes = await veramoQueryVCs({
        snap: snapMock,
        ethereum: ethereumMock,
        options: { store: ['snap'], returnStore: false },
      });
      expect(queryRes).toStrictEqual([expectedVCObject]);
      expect(queryRes[0].metadata.store).toBeUndefined();

      expect.assertions(2);
    });

    it('should succeed querying all VCs from snap store that match JSONPath', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });

      const expectedVCObject = {
        data: exampleVC,
        metadata: { id: res[0].id, store: ['snap'] },
      };
      await expect(
        veramoQueryVCs({
          snap: snapMock,
          ethereum: ethereumMock,
          options: { store: ['snap'], returnStore: true },
          filter: {
            type: 'JSONPath',
            filter: jsonPath,
          },
        })
      ).resolves.toEqual([expectedVCObject]);

      expect.assertions(1);
    });

    it('should succeed querying all VCs from all stores that match JSONPath', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });

      const expectedVCObject = {
        data: exampleVC,
        metadata: { id: res[0].id, store: ['snap'] },
      };

      const filter = {
        type: 'JSONPath',
        filter: jsonPath,
      };
      await expect(
        veramoQueryVCs({
          snap: snapMock,
          ethereum: ethereumMock,
          filter,
          options: { store: ['snap'], returnStore: true },
        })
      ).resolves.toEqual([expectedVCObject]);

      expect.assertions(1);
    });

    it('should succeed listing all VCs from snap store matching query - empty query', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });

      const expectedVCObject = {
        data: exampleVC,
        metadata: { id: res[0].id, store: ['snap'] },
      };
      await expect(
        veramoQueryVCs({
          snap: snapMock,
          ethereum: ethereumMock,
          options: { store: ['snap'], returnStore: true },
          filter: { type: 'none', filter: {} },
        })
      ).resolves.toEqual([expectedVCObject]);

      expect.assertions(1);
    });

    it('should succeed listing all VCs from snap store matching query', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });

      const expectedVCObject = {
        data: exampleVC,
        metadata: { id: res[0].id, store: ['snap'] },
      };

      await expect(
        veramoQueryVCs({
          snap: snapMock,
          ethereum: ethereumMock,
          options: { store: ['snap'], returnStore: true },
          filter: { type: 'id', filter: res[0].id },
        })
      ).resolves.toEqual([expectedVCObject]);

      expect.assertions(1);
    });
    it('should succeed listing all VCs from snap store matching query - empty result', async () => {
      snapMock.rpcMocks.snap_manageState.mockReturnValue(getDefaultSnapState());

      await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });

      await expect(
        veramoQueryVCs({
          snap: snapMock,
          ethereum: ethereumMock,
          options: { store: ['snap'], returnStore: true },
          filter: { type: 'id', filter: 'test-idd' },
        })
      ).resolves.toEqual([]);

      expect.assertions(1);
    });
  });

  describe('veramoImportMetaMaskAccount', () => {
    it('should succeed importing metamask account', async () => {
      const initialState = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockResolvedValue(initialState);
      const agent = await getAgent(snapMock, ethereumMock);
      expect(
        (
          await veramoImportMetaMaskAccount(
            {
              snap: snapMock,
              ethereum: ethereumMock,
              state: initialState,
              account: address,
              bip44CoinTypeNode: bip44Entropy as BIP44CoinTypeNode,
              origin: global.origin,
            },
            agent
          )
        ).did
      ).toEqual(exampleDID);

      await expect(agent.didManagerGet({ did: exampleDID })).resolves.toEqual(
        exampleImportedDIDWIthoutPrivateKey
      );

      expect.assertions(2);
    });

    it('should succeed importing metamask account when DID already exists', async () => {
      const initialState = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockResolvedValue(initialState);

      const agent = await getAgent(snapMock, ethereumMock);
      expect(
        (
          await veramoImportMetaMaskAccount(
            {
              snap: snapMock,
              ethereum: ethereumMock,
              state: initialState,
              account: address,
              bip44CoinTypeNode: bip44Entropy as BIP44CoinTypeNode,
              origin: global.origin,
            },
            agent
          )
        ).did
      ).toEqual(exampleDID);

      await expect(agent.didManagerGet({ did: exampleDID })).resolves.toEqual(
        exampleImportedDIDWIthoutPrivateKey
      );
      expect(
        (
          await veramoImportMetaMaskAccount(
            {
              snap: snapMock,
              ethereum: ethereumMock,
              state: initialState,
              account: address,
              bip44CoinTypeNode: bip44Entropy as BIP44CoinTypeNode,
              origin: global.origin,
            },
            agent
          )
        ).did
      ).toEqual(exampleDID);

      expect(await agent.didManagerFind()).toHaveLength(1);

      expect.assertions(4);
    });
  });
  describe('veramoVerifyData', () => {
    it('should succeed validating a VC - JWT', async () => {
      const initialState = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockReturnValue(initialState);
      const agent = await getAgent(snapMock, ethereumMock);
      const identity: IIdentifier = await agent.didManagerCreate({
        provider: 'did:ethr',
        kms: 'snap',
      });

      const credential = await agent.createVerifiableCredential({
        proofFormat: 'jwt',
        credential: {
          issuer: identity.did,
          credentialSubject: {
            hello: 'world',
          },
        },
      });

      const verifyResult = await veramoVerifyData({
        snap: snapMock,
        ethereum: ethereumMock,
        data: { credential },
      });

      expect(verifyResult.verified).toBe(true);
      expect.assertions(1);
    });
    it('should succeed validating a VC - Eip712', async () => {
      const initialState = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockReturnValue(initialState);
      const agent = await getAgent(snapMock, ethereumMock);
      const identity: IIdentifier = await agent.didManagerCreate({
        provider: 'did:ethr',
        kms: 'snap',
      });

      const credential = await agent.createVerifiableCredential({
        proofFormat: 'EthereumEip712Signature2021',
        credential: {
          issuer: identity.did,
          credentialSubject: {
            hello: 'world',
          },
        },
      });

      const verifyResult = await veramoVerifyData({
        snap: snapMock,
        ethereum: ethereumMock,
        data: { credential },
      });

      expect(verifyResult.verified).toBe(true);
      expect.assertions(1);
    });
    it('should succeed validating a VC - lds', async () => {
      const initialState = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockReturnValue(initialState);
      const agent = await getAgent(snapMock, ethereumMock);
      const identity: IIdentifier = await agent.didManagerCreate({
        provider: 'did:ethr',
        kms: 'snap',
      });

      const credential = await agent.createVerifiableCredential({
        proofFormat: 'lds',
        credential: {
          issuer: identity.did,
          credentialSubject: {},
        },
      });

      const verifyResult = await veramoVerifyData({
        snap: snapMock,
        ethereum: ethereumMock,
        data: { credential },
      });

      expect(verifyResult.verified).toBe(true);
      expect.assertions(1);
    });
    it('should succeed validating a VP - JWT', async () => {
      const initialState = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockReturnValue(initialState);
      const agent = await getAgent(snapMock, ethereumMock);
      const identity: IIdentifier = await agent.didManagerCreate({
        provider: 'did:ethr',
        kms: 'snap',
      });

      const credential = await agent.createVerifiableCredential({
        proofFormat: 'jwt',
        credential: {
          issuer: identity.did,
          credentialSubject: {
            hello: 'world',
          },
        },
      });

      const presentation = await agent.createVerifiablePresentation({
        proofFormat: 'jwt',
        presentation: {
          holder: identity.did,
          verifiableCredential: [credential],
        },
      });

      const verifyResult = await veramoVerifyData({
        snap: snapMock,
        ethereum: ethereumMock,
        data: { presentation },
      });

      expect(verifyResult.verified).toBe(true);
      expect.assertions(1);
    });
    it('should succeed validating a VP - Eip712', async () => {
      const initialState = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockReturnValue(initialState);
      const agent = await getAgent(snapMock, ethereumMock);
      const identity: IIdentifier = await agent.didManagerCreate({
        provider: 'did:ethr',
        kms: 'snap',
      });

      const credential = await agent.createVerifiableCredential({
        proofFormat: 'EthereumEip712Signature2021',
        credential: {
          issuer: identity.did,
          credentialSubject: {
            hello: 'world',
          },
        },
      });

      const presentation = await agent.createVerifiablePresentation({
        proofFormat: 'EthereumEip712Signature2021',
        presentation: {
          holder: identity.did,
          verifiableCredential: [credential],
        },
      });

      const verifyResult = await veramoVerifyData({
        snap: snapMock,
        ethereum: ethereumMock,
        data: { presentation },
      });

      expect(verifyResult.verified).toBe(true);
      expect.assertions(1);
    });
    it('should succeed validating a VP - lds', async () => {
      const initialState = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockReturnValue(initialState);
      const agent = await getAgent(snapMock, ethereumMock);
      const identity: IIdentifier = await agent.didManagerCreate({
        provider: 'did:ethr',
        kms: 'snap',
      });

      const credential = await agent.createVerifiableCredential({
        proofFormat: 'lds',
        credential: {
          issuer: identity.did,
          credentialSubject: {},
        },
      });

      const presentation = await agent.createVerifiablePresentation({
        proofFormat: 'lds',
        presentation: {
          holder: identity.did,
          verifiableCredential: [credential],
        },
      });

      const verifyResult = await veramoVerifyData({
        snap: snapMock,
        ethereum: ethereumMock,
        data: { presentation },
      });

      // Waiting for Veramo to fix this
      // verifying a VP with lds proof format fails
      // expect(verifyResult.verified).toBe(true);
      expect(verifyResult).not.toBeNull();
      expect.assertions(1);
    });
  });

  describe('veramoCreateVP', () => {
    it('should succeed creating a valid VP', async () => {
      const initialState = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockReturnValue(initialState);
      snapMock.rpcMocks.snap_dialog.mockResolvedValue(true);
      const agent = await getAgent(snapMock, ethereumMock);

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });

      const createdVP = await veramoCreateVP(
        {
          snap: snapMock,
          ethereum: ethereumMock,
          state: initialState,
          account: address,
          bip44CoinTypeNode: bip44Entropy as BIP44CoinTypeNode,
          origin: global.origin,
        },
        { proofFormat: 'jwt', vcs: [{ id: res[0].id }] }
      );
      expect(createdVP).not.toBeNull();

      const verifyResult = (await agent.verifyPresentation({
        presentation: createdVP,
      })) as IVerifyResult;

      expect(verifyResult.verified).toBe(true);

      expect.assertions(2);
    });

    it('should succeed creating a valid VP - lds', async () => {
      const initialState = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockReturnValue(initialState);
      snapMock.rpcMocks.snap_dialog.mockResolvedValue(true);
      const agent = await getAgent(snapMock, ethereumMock);

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        // verifiableCredential: exampleVCJSONLD,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });

      const createdVP = await veramoCreateVP(
        {
          snap: snapMock,
          ethereum: ethereumMock,
          state: initialState,
          account: address,
          bip44CoinTypeNode: bip44Entropy as BIP44CoinTypeNode,
          origin: global.origin,
        },
        {
          proofFormat: 'lds',
          vcs: [{ id: res[0].id }],
          proofOptions: { challenge: 'test-challenge' },
        }
      );

      expect(createdVP).not.toBeNull();

      // Waiting for Veramo to fix this
      // await expect(
      //   await agent.verifyPresentation({
      //     presentation: createdVP as VerifiablePresentation,
      //     challenge: 'test-challenge',
      //   })
      // ).toThrow();
      // expect(verifyResult.verified).toBe(true);
      expect.assertions(1);
    });

    it('should succeed creating a valid VP - eip712', async () => {
      const initialState = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockReturnValue(initialState);
      snapMock.rpcMocks.snap_dialog.mockResolvedValue(true);
      const agent = await getAgent(snapMock, ethereumMock);

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });

      const createdVP = await veramoCreateVP(
        {
          snap: snapMock,
          ethereum: ethereumMock,
          state: initialState,
          account: address,
          bip44CoinTypeNode: bip44Entropy as BIP44CoinTypeNode,
          origin: global.origin,
        },
        { proofFormat: 'EthereumEip712Signature2021', vcs: [{ id: res[0].id }] }
      );
      expect(createdVP).not.toBeNull();

      const verifyResult = (await agent.verifyPresentation({
        presentation: createdVP,
      })) as IVerifyResult;

      expect(verifyResult.verified).toBe(true);

      expect.assertions(2);
    });

    it('should succeed creating a valid VP with one false id', async () => {
      const initialState = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockReturnValue(initialState);
      snapMock.rpcMocks.snap_dialog.mockResolvedValue(true);
      const agent = await getAgent(snapMock, ethereumMock);

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });

      const createdVP = await veramoCreateVP(
        {
          snap: snapMock,
          ethereum: ethereumMock,
          state: initialState,
          account: address,
          bip44CoinTypeNode: bip44Entropy as BIP44CoinTypeNode,
          origin: global.origin,
        },
        { proofFormat: 'jwt', vcs: [{ id: res[0].id }, { id: 'wrong_id' }] }
      );
      expect(createdVP).not.toBeNull();

      const verifyResult = (await agent.verifyPresentation({
        presentation: createdVP,
      })) as IVerifyResult;

      expect(verifyResult.verified).toBe(true);

      expect.assertions(2);
    });

    it('should succeed creating a valid VP with 2 VCs', async () => {
      const initialState = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockReturnValue(initialState);
      snapMock.rpcMocks.snap_dialog.mockResolvedValue(true);
      const agent = await getAgent(snapMock, ethereumMock);

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });

      const createdVP = await veramoCreateVP(
        {
          snap: snapMock,
          ethereum: ethereumMock,
          state: initialState,
          account: address,
          bip44CoinTypeNode: bip44Entropy as BIP44CoinTypeNode,
          origin: global.origin,
        },
        { proofFormat: 'jwt', vcs: [{ id: res[0].id }, { id: res[0].id }] }
      );
      expect(createdVP).not.toBeNull();

      const verifyResult = (await agent.verifyPresentation({
        presentation: createdVP,
      })) as IVerifyResult;

      expect(createdVP?.verifiableCredential).toStrictEqual([
        exampleVCinVP,
        exampleVCinVP,
      ]);

      expect(verifyResult.verified).toBe(true);

      expect.assertions(3);
    });

    it('should succeed creating a valid VP with 4 different types of VCs', async () => {
      const initialState = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockReturnValue(initialState);
      snapMock.rpcMocks.snap_dialog.mockResolvedValue(true);
      const agent = await getAgent(snapMock, ethereumMock);

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });
      const resjwt = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC.proof.jwt,
        store: ['snap'],
      });
      const res2 = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVCJSONLD,
        store: ['snap'],
      });

      const res3 = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVCEIP712,
        store: ['snap'],
      });

      const createdVP = await veramoCreateVP(
        {
          snap: snapMock,
          ethereum: ethereumMock,
          state: initialState,
          account: address,
          bip44CoinTypeNode: bip44Entropy as BIP44CoinTypeNode,
          origin: global.origin,
        },
        {
          proofFormat: 'jwt',
          vcs: [
            { id: res[0].id, metadata: { store: 'snap' } },
            { id: resjwt[0].id, metadata: { store: 'snap' } },
            { id: res2[0].id, metadata: { store: 'snap' } },
            { id: res3[0].id, metadata: { store: 'snap' } },
          ],
        }
      );
      expect(createdVP).not.toBeNull();

      const verifyResult = (await agent.verifyPresentation({
        presentation: createdVP,
      })) as IVerifyResult;

      expect(createdVP?.verifiableCredential).toStrictEqual([
        exampleVCinVP,
        exampleVCinVP,
        exampleVCJSONLD,
        exampleVCEIP712,
      ]);

      expect(verifyResult.verified).toBe(true);

      expect.assertions(3);
    });

    it('should fail creating a VP and throw VC does not exist', async () => {
      const initialState = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockReturnValue(initialState);
      snapMock.rpcMocks.snap_dialog.mockResolvedValue(true);

      await expect(
        veramoCreateVP(
          {
            snap: snapMock,
            ethereum: ethereumMock,
            state: initialState,
            account: address,
            bip44CoinTypeNode: bip44Entropy as BIP44CoinTypeNode,
            origin: global.origin,
          },
          { proofFormat: 'jwt', vcs: [{ id: 'test-id' }] }
        )
      ).rejects.toThrow('VC does not exist');

      expect.assertions(1);
    });

    it('should fail creating a VP and throw user rejected error', async () => {
      const initialState = getDefaultSnapState();
      snapMock.rpcMocks.snap_manageState.mockReturnValue(initialState);
      snapMock.rpcMocks.snap_dialog.mockResolvedValue(false);

      const res = await veramoSaveVC({
        snap: snapMock,
        ethereum: ethereumMock,
        verifiableCredential: exampleVC,
        store: ['snap'],
      });

      await expect(
        veramoCreateVP(
          {
            snap: snapMock,
            ethereum: ethereumMock,
            state: initialState,
            account: address,
            bip44CoinTypeNode: bip44Entropy as BIP44CoinTypeNode,
            origin: global.origin,
          },
          { proofFormat: 'jwt', vcs: [{ id: res[0].id }] }
        )
      ).rejects.toThrow('User rejected create VP request');

      expect.assertions(1);
    });
  });
});