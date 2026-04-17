declare global {
  interface Window {
    store?: any;
    CdvPurchase?: any;
  }
}

const PRODUCT_IDS = {
  ENTRY: 'clara_entry_299',
  CORE: 'clara_core_499',
  COACHING: 'clara_coaching_999',
};

let initialized = false;

function waitForStore(timeout = 10000): Promise<any> {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    const check = () => {
      const store = window.CdvPurchase?.store || window.store;
      if (store) {
        resolve(store);
        return;
      }
      if (Date.now() - started >= timeout) {
        reject(new Error('Google Play Billing store not found.'));
        return;
      }
      setTimeout(check, 300);
    };

    check();
  });
}

export async function initGooglePlayBilling() {
  if (initialized) return true;

  const store = await waitForStore();

  const platform =
    window.CdvPurchase?.Platform?.GOOGLE_PLAY ||
    'android-playstore';

  const productType =
    window.CdvPurchase?.ProductType?.NON_CONSUMABLE ||
    'non consumable';

  store.verbosity = store.DEBUG || 1;

  store.register([
    {
      id: PRODUCT_IDS.ENTRY,
      type: productType,
      platform,
    },
    {
      id: PRODUCT_IDS.CORE,
      type: productType,
      platform,
    },
    {
      id: PRODUCT_IDS.COACHING,
      type: productType,
      platform,
    },
  ]);

  store.when()
    .approved((transaction: any) => {
      transaction.verify();
    })
    .verified((receipt: any) => {
      receipt.finish();
    });

  await new Promise<void>((resolve) => {
    store.ready(() => resolve());
    store.initialize([platform]);
  });

  initialized = true;
  return true;
}

export async function orderGooglePlayProduct(
  productId: 'clara_entry_299' | 'clara_core_499' | 'clara_coaching_999'
) {
  const store = await waitForStore();
  await initGooglePlayBilling();

  const product =
    store.get(productId, window.CdvPurchase?.Platform?.GOOGLE_PLAY || 'android-playstore');

  if (!product) {
    throw new Error(`Product ${productId} not found in Google Play Billing.`);
  }

  await product.getOffer()?.order();
  return true;
}

export async function isGooglePlayBillingAvailable() {
  try {
    await waitForStore(4000);
    await initGooglePlayBilling();
    return true;
  } catch {
    return false;
  }
}

export { PRODUCT_IDS };