import {
  AvailableVCStores,
  CreateVPRequestParams,
  DeleteVCsRequestParams,
  QueryVCsRequestParams,
  ResolveDIDRequestParams,
  SaveVCRequestParams,
  SetVCStoreRequestParams,
  SwitchMethodRequestParams,
  VerifyDataRequestParams,
  isAvailableMethods,
  isAvailableVCStores,
  isSupportedProofFormat,
} from '@blockchain-lab-um/ssi-snap-types';
import { SSISnapState } from 'src/interfaces';

import { isEnabledVCStore } from './snapUtils';

function isStringArray(input: unknown): input is string[] {
  return (
    Array.isArray(input) &&
    input.length > 0 &&
    input.every((item) => typeof item === 'string')
  );
}
function isArray(input: unknown): input is unknown[] {
  return Array.isArray(input);
}

export function isValidSaveVCRequest(
  params: unknown,
  account: string,
  state: SSISnapState
): asserts params is SaveVCRequestParams {
  const param = params as SaveVCRequestParams;
  if (
    param !== null &&
    typeof param === 'object' &&
    'verifiableCredential' in param &&
    param.verifiableCredential !== null
  ) {
    if (
      'options' in param &&
      param.options !== null &&
      typeof param.options === 'object'
    ) {
      if ('store' in param.options && param.options?.store !== null) {
        if (typeof param.options?.store === 'string') {
          if (!isAvailableVCStores(param.options?.store)) {
            throw new Error(`Store ${param.options?.store} is not supported!`);
          }
          if (!isEnabledVCStore(account, state, param.options?.store)) {
            throw new Error(`Store ${param.options?.store} is not enabled!`);
          }
        } else if (
          Array.isArray(param.options?.store) &&
          param.options?.store.length > 0
        ) {
          (param.options?.store as [string]).forEach((store) => {
            if (!isAvailableVCStores(store)) {
              throw new Error(`Store ${store} is not supported!`);
            }
            if (!isEnabledVCStore(account, state, store as AvailableVCStores)) {
              throw new Error(`Store ${store} is not enabled!`);
            }
          });
        } else throw new Error('Store is invalid format');
      }
    }
    return;
  }

  throw new Error('Invalid SaveVC request');
}

export function isValidCreateVPRequest(
  params: unknown,
  account: string,
  state: SSISnapState
): asserts params is CreateVPRequestParams {
  const param = params as CreateVPRequestParams;
  if (
    param !== null &&
    typeof param === 'object' &&
    'vcs' in param &&
    param.vcs !== null &&
    isArray(param.vcs) &&
    param.vcs.length > 0
  ) {
    // Check if proofFormat is valid
    if (
      'proofFormat' in param &&
      param.proofFormat !== null &&
      !isSupportedProofFormat(param.proofFormat as string)
    ) {
      throw new Error('Proof format not supported');
    }
    if (
      'proofOptions' in param &&
      param.proofOptions !== null &&
      param.proofOptions?.domain !== null &&
      typeof param.proofOptions?.domain !== 'string'
    ) {
      throw new Error('Domain is not a string');
    }

    // check if challenge is a string
    if (
      'proofOptions' in param &&
      param.proofOptions !== null &&
      param.proofOptions?.challenge !== null &&
      typeof param.proofOptions?.challenge !== 'string'
    ) {
      throw new Error('Challenge is not a string');
    }

    // check if type is correct string
    if (
      'proofOptions' in param &&
      param.proofOptions !== null &&
      param.proofOptions?.type !== null &&
      typeof param.proofOptions?.type !== 'string'
    ) {
      throw new Error('Type is not a string');
    }

    // Check if vcs is valid
    param.vcs.forEach((vc) => {
      if (
        vc !== null &&
        typeof vc === 'object' &&
        'id' in vc &&
        typeof vc.id === 'string'
      ) {
        if (
          'metadata' in vc &&
          vc.metadata !== null &&
          typeof vc.metadata === 'object' &&
          'store' in vc.metadata &&
          vc.metadata.store !== null &&
          typeof vc.metadata.store === 'string' &&
          !isAvailableVCStores(vc.metadata.store)
        ) {
          throw new Error(`Store ${vc.metadata.store} is not supported!`);
        }
        if (
          'metadata' in vc &&
          vc.metadata !== null &&
          typeof vc.metadata === 'object' &&
          'store' in vc.metadata &&
          vc.metadata.store !== null &&
          typeof vc.metadata.store === 'string' &&
          !isEnabledVCStore(account, state, vc.metadata?.store)
        ) {
          throw new Error(`Store ${vc.metadata.store} is not enabled!`);
        }
      } else throw new Error('VC is invalid format');
    });
    return;
  }

  throw new Error('Invalid CreateVP request');
}

export function isValidSwitchMethodRequest(
  params: unknown
): asserts params is SwitchMethodRequestParams {
  const param = params as SwitchMethodRequestParams;
  if (
    param !== null &&
    typeof param === 'object' &&
    'didMethod' in param &&
    param.didMethod !== null
  ) {
    if (!isAvailableMethods(param.didMethod))
      throw new Error('Did method is not supported!');
    return;
  }
  throw new Error('Invalid switchDIDMethod request.');
}

export function isValidSetVCStoreRequest(
  params: unknown
): asserts params is SetVCStoreRequestParams {
  const param = params as SetVCStoreRequestParams;
  if (
    param !== null &&
    typeof param === 'object' &&
    'store' in param &&
    param.store !== null &&
    'value' in param &&
    param.value !== null &&
    typeof param.value === 'boolean'
  ) {
    if (!isAvailableVCStores(param.store)) {
      throw new Error(`Store ${param.store} is not supported!`);
    }
    return;
  }
  throw new Error('Invalid setVCStore request.');
}

export function isValidDeleteVCRequest(
  params: unknown,
  account: string,
  state: SSISnapState
): asserts params is DeleteVCsRequestParams {
  const param = params as DeleteVCsRequestParams;
  if (
    param !== null &&
    typeof param === 'object' &&
    'id' in param &&
    param.id !== null
  ) {
    if (typeof param.id !== 'string' && !isStringArray(param.id)) {
      throw new Error('ID is not a string or array of strings');
    }
    if (
      'options' in param &&
      param.options !== null &&
      typeof param.options === 'object'
    ) {
      if ('store' in param.options && param.options?.store !== null) {
        if (typeof param.options?.store === 'string') {
          if (!isAvailableVCStores(param.options?.store)) {
            throw new Error(`Store ${param.options?.store} is not supported!`);
          }
          if (!isEnabledVCStore(account, state, param.options?.store)) {
            throw new Error(`Store ${param.options?.store} is not enabled!`);
          }
        } else if (
          Array.isArray(param.options?.store) &&
          param.options?.store.length > 0
        ) {
          (param.options?.store as [string]).forEach((store) => {
            if (!isAvailableVCStores(store))
              throw new Error(`Store ${store} is not supported!`);
            if (!isEnabledVCStore(account, state, store as AvailableVCStores)) {
              throw new Error(`Store ${store} is not enabled!`);
            }
          });
        } else throw new Error('Store is invalid format');
      }
    }
    return;
  }
  throw new Error('Invalid DeleteVC request');
}

export function isValidQueryRequest(
  params: unknown,
  account: string,
  state: SSISnapState
): asserts params is QueryVCsRequestParams {
  if (params == null) return;
  const param = params as QueryVCsRequestParams;
  if (
    'filter' in param &&
    param.filter !== null &&
    typeof param.filter === 'object'
  ) {
    if (
      !(
        'type' in param.filter &&
        param.filter?.type !== null &&
        typeof param.filter?.type === 'string'
      )
    ) {
      throw new Error('Filter type is missing or not a string!');
    }
    if (!('filter' in param.filter && param.filter?.filter !== null)) {
      throw new Error('Filter is missing!');
    }
  }

  if (
    'options' in param &&
    param.options !== null &&
    typeof param.options === 'object'
  ) {
    if ('store' in param.options && param.options?.store !== null) {
      if (typeof param.options?.store === 'string') {
        if (!isAvailableVCStores(param.options?.store)) {
          throw new Error(`Store ${param.options?.store} is not supported!`);
        }
        if (!isEnabledVCStore(account, state, param.options?.store)) {
          throw new Error(`Store ${param.options?.store} is not enabled!`);
        }
      } else if (
        Array.isArray(param.options?.store) &&
        param.options?.store.length > 0
      ) {
        (param.options?.store as [string]).forEach((store) => {
          if (!isAvailableVCStores(store))
            throw new Error(`Store ${store} is not supported!`);
          if (!isEnabledVCStore(account, state, store as AvailableVCStores))
            throw new Error(`Store ${store} is not enabled!`);
        });
      } else throw new Error('Store is invalid format');
    }
    if ('returnStore' in param.options) {
      if (
        !(
          'returnStore' in param.options &&
          param.options?.returnStore !== null &&
          typeof param.options?.returnStore === 'boolean'
        )
      ) {
        throw new Error('ReturnStore is invalid format');
      }
    }
  }
}

export function isValidResolveDIDRequest(
  params: unknown
): asserts params is ResolveDIDRequestParams {
  const param = params as ResolveDIDRequestParams;
  if (
    param !== null &&
    typeof param === 'object' &&
    'did' in param &&
    param.did !== null &&
    param.did !== '' &&
    typeof param.did === 'string'
  )
    return;

  throw new Error('Invalid ResolveDID request');
}

export function isValidVerifyDataRequest(
  params: unknown
): asserts params is VerifyDataRequestParams {
  const param = params as VerifyDataRequestParams;
  if (
    param !== null &&
    typeof param === 'object' &&
    (('credential' in param && param.credential !== null) ||
      ('presentation' in param && param.presentation !== null))
  )
    return;

  throw new Error('Invalid VerifyData request');
}