package com.clara.lifeos.app;

import android.app.Activity;
import android.content.pm.PackageManager;

import androidx.annotation.NonNull;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "ClaraBilling")
public class ClaraBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private BillingClient billingClient;
    private PluginCall savedCall;

    private String normalizeProductType(String value) {
        if (value == null) return BillingClient.ProductType.INAPP;
        String normalized = value.trim().toLowerCase();
        if (normalized.equals("subs") || normalized.equals("subscription")) {
            return BillingClient.ProductType.SUBS;
        }
        return BillingClient.ProductType.INAPP;
    }

    private String getInstallerPackageName() {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                return getContext()
                        .getPackageManager()
                        .getInstallSourceInfo(getContext().getPackageName())
                        .getInstallingPackageName();
            }

            return getContext()
                    .getPackageManager()
                    .getInstallerPackageName(getContext().getPackageName());
        } catch (PackageManager.NameNotFoundException | RuntimeException ignored) {
            return "";
        }
    }

    private void addDeviceDiagnostics(JSObject ret) {
        String installer = getInstallerPackageName();
        ret.put("packageName", getContext().getPackageName());
        ret.put("installerPackageName", installer);
        ret.put("isAppFromPlay", "com.android.vending".equals(installer));
        ret.put("isPlayStoreInstalled", isPackageInstalled("com.android.vending"));
        ret.put("isGooglePlayServicesAvailable", isPackageInstalled("com.google.android.gms"));
        ret.put("billingBridge", "ClaraBillingPlugin");
        ret.put("pluginVersion", "2026.04.billing-v2");
    }

    private boolean isPackageInstalled(String packageName) {
        try {
            getContext().getPackageManager().getPackageInfo(packageName, 0);
            return true;
        } catch (PackageManager.NameNotFoundException | RuntimeException ignored) {
            return false;
        }
    }

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(
                        PendingPurchasesParams.newBuilder()
                                .enableOneTimeProducts()
                                .build()
                )
                .build();
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (billingClient == null) {
            JSObject ret = new JSObject();
            ret.put("ok", false);
            ret.put("responseCode", "ERROR");
            ret.put("debugMessage", "Billing client is not initialized.");
            addDeviceDiagnostics(ret);
            call.resolve(ret);
            return;
        }

        if (billingClient.isReady()) {
            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("responseCode", BillingClient.BillingResponseCode.OK);
            ret.put("debugMessage", "Billing client already connected.");
            addDeviceDiagnostics(ret);
            call.resolve(ret);
            return;
        }

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                JSObject ret = new JSObject();
                ret.put("ok", billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK);
                ret.put("responseCode", billingResult.getResponseCode());
                ret.put("debugMessage", billingResult.getDebugMessage());
                addDeviceDiagnostics(ret);
                call.resolve(ret);
            }

            @Override
            public void onBillingServiceDisconnected() {
                JSObject ret = new JSObject();
                ret.put("ok", false);
                ret.put("responseCode", -1);
                ret.put("debugMessage", "Billing disconnected");
                addDeviceDiagnostics(ret);
                call.resolve(ret);
            }
        });
    }

    @PluginMethod
    public void queryProducts(PluginCall call) {
        if (billingClient == null) {
            JSObject ret = new JSObject();
            ret.put("ok", false);
            ret.put("responseCode", "ERROR");
            ret.put("debugMessage", "Billing client is not initialized.");
            addDeviceDiagnostics(ret);
            call.resolve(ret);
            return;
        }

        if (!billingClient.isReady()) {
            JSObject ret = new JSObject();
            ret.put("ok", false);
            ret.put("responseCode", -1);
            ret.put("debugMessage", "Billing client is not connected.");
            addDeviceDiagnostics(ret);
            call.resolve(ret);
            return;
        }

        JSArray productIdsArray = call.getArray("productIds");
        JSObject productTypes = call.getObject("productTypes");
        String fallbackProductType = normalizeProductType(call.getString("productType"));
        if (productIdsArray == null || productIdsArray.length() == 0) {
            call.reject("Missing productIds");
            return;
        }

        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();

        try {
            for (int i = 0; i < productIdsArray.length(); i++) {
                String id = productIdsArray.getString(i);
                if (id != null && !id.trim().isEmpty()) {
                    String productType = fallbackProductType;
                    if (productTypes != null) {
                        Object mappedType = productTypes.opt(id.trim());
                        if (mappedType != null) {
                            productType = normalizeProductType(String.valueOf(mappedType));
                        }
                    }
                    productList.add(
                            QueryProductDetailsParams.Product.newBuilder()
                                    .setProductId(id.trim())
                                    .setProductType(productType)
                                    .build()
                    );
                }
            }
        } catch (JSONException e) {
            call.reject("Invalid productIds");
            return;
        }

        if (productList.isEmpty()) {
            call.reject("No valid productIds provided");
            return;
        }

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, result) -> {
            JSObject ret = new JSObject();
            ret.put("ok", billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK);
            ret.put("responseCode", billingResult.getResponseCode());
            ret.put("debugMessage", billingResult.getDebugMessage());

            JSArray found = new JSArray();
            JSArray missing = new JSArray();
            JSArray queried = new JSArray();
            JSObject queriedTypes = new JSObject();
            JSArray details = new JSArray();

            List<ProductDetails> list = result.getProductDetailsList();

            if (list != null) {
                for (ProductDetails pd : list) {
                    found.put(pd.getProductId());
                    JSObject detail = new JSObject();
                    detail.put("productId", pd.getProductId());
                    detail.put("productType", pd.getProductType());
                    detail.put("title", pd.getTitle());
                    detail.put("name", pd.getName());
                    detail.put("description", pd.getDescription());

                    if (pd.getSubscriptionOfferDetails() != null && !pd.getSubscriptionOfferDetails().isEmpty()) {
                        ProductDetails.SubscriptionOfferDetails offer = pd.getSubscriptionOfferDetails().get(0);
                        if (offer.getPricingPhases() != null
                                && offer.getPricingPhases().getPricingPhaseList() != null
                                && !offer.getPricingPhases().getPricingPhaseList().isEmpty()) {
                            ProductDetails.PricingPhase phase = offer.getPricingPhases().getPricingPhaseList().get(0);
                            detail.put("formattedPrice", phase.getFormattedPrice());
                            detail.put("priceCurrencyCode", phase.getPriceCurrencyCode());
                            detail.put("billingPeriod", phase.getBillingPeriod());
                        }
                        detail.put("basePlanId", offer.getBasePlanId());
                        detail.put("offerToken", offer.getOfferToken());
                    } else if (pd.getOneTimePurchaseOfferDetails() != null) {
                        detail.put("formattedPrice", pd.getOneTimePurchaseOfferDetails().getFormattedPrice());
                        detail.put("priceCurrencyCode", pd.getOneTimePurchaseOfferDetails().getPriceCurrencyCode());
                    }

                    details.put(detail);
                }
            }

            try {
                for (int i = 0; i < productIdsArray.length(); i++) {
                    String id = productIdsArray.getString(i);
                    queried.put(id);
                    boolean exists = false;
                    String productType = fallbackProductType;
                    if (productTypes != null) {
                        Object mappedType = productTypes.opt(id.trim());
                        if (mappedType != null) {
                            productType = normalizeProductType(String.valueOf(mappedType));
                        }
                    }
                    queriedTypes.put(id, productType);

                    if (list != null) {
                        for (ProductDetails pd : list) {
                            if (pd.getProductId().equals(id)) {
                                exists = true;
                                break;
                            }
                        }
                    }

                    if (!exists) {
                        missing.put(id);
                    }
                }
            } catch (JSONException ignored) {
            }

            ret.put("foundProductIds", found);
            ret.put("missingProductIds", missing);
            ret.put("queriedProductIds", queried);
            ret.put("queriedProductTypes", queriedTypes);
            ret.put("productDetails", details);
            addDeviceDiagnostics(ret);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void purchaseOneTimeProduct(PluginCall call) {
        launchProductPurchase(call);
    }

    @PluginMethod
    public void purchaseSubscription(PluginCall call) {
        launchProductPurchase(call);
    }

    @PluginMethod
    public void subscribe(PluginCall call) {
        launchProductPurchase(call);
    }

    @PluginMethod
    public void purchaseProduct(PluginCall call) {
        launchProductPurchase(call);
    }

    @PluginMethod
    public void launchPurchase(PluginCall call) {
        launchProductPurchase(call);
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        launchProductPurchase(call);
    }

    private void launchProductPurchase(PluginCall call) {
        if (billingClient == null) {
            call.reject("Billing client is not initialized.");
            return;
        }

        if (!billingClient.isReady()) {
            call.reject("Billing client is not connected.");
            return;
        }

        String productId = call.getString("productId");
        String productType = normalizeProductType(call.getString("productType"));
        if (productId == null || productId.trim().isEmpty()) {
            call.reject("Missing productId");
            return;
        }

        savedCall = call;

        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        productList.add(
                QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId.trim())
                        .setProductType(productType)
                        .build()
        );

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, result) -> {
            if (savedCall == null) return;

            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                savedCall.reject("Query failed: " + billingResult.getDebugMessage(), String.valueOf(billingResult.getResponseCode()));
                savedCall = null;
                return;
            }

            List<ProductDetails> list = result.getProductDetailsList();
            if (list == null || list.isEmpty()) {
                savedCall.reject("Product not found: " + productId.trim(), String.valueOf(BillingClient.BillingResponseCode.ITEM_UNAVAILABLE));
                savedCall = null;
                return;
            }

            ProductDetails productDetails = list.get(0);

            List<BillingFlowParams.ProductDetailsParams> paramsList = new ArrayList<>();
            BillingFlowParams.ProductDetailsParams.Builder detailsBuilder =
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(productDetails);

            if (BillingClient.ProductType.SUBS.equals(productType)
                    && productDetails.getSubscriptionOfferDetails() != null
                    && !productDetails.getSubscriptionOfferDetails().isEmpty()) {
                detailsBuilder.setOfferToken(
                        productDetails.getSubscriptionOfferDetails().get(0).getOfferToken()
                );
            }

            paramsList.add(detailsBuilder.build());

            BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(paramsList)
                    .build();

            Activity activity = getActivity();
            if (activity == null) {
                savedCall.reject("Activity is not available.");
                savedCall = null;
                return;
            }

            BillingResult launchResult = billingClient.launchBillingFlow(activity, flowParams);
            if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                savedCall.reject("Launch failed: " + launchResult.getDebugMessage(), String.valueOf(launchResult.getResponseCode()));
                savedCall = null;
            }
        });
    }

    @PluginMethod
    public void queryOwnedPurchases(PluginCall call) {
        if (billingClient == null) {
            JSObject ret = new JSObject();
            ret.put("ok", false);
            ret.put("responseCode", "ERROR");
            ret.put("debugMessage", "Billing client is not initialized.");
            call.resolve(ret);
            return;
        }

        if (!billingClient.isReady()) {
            JSObject ret = new JSObject();
            ret.put("ok", false);
            ret.put("responseCode", -1);
            ret.put("debugMessage", "Billing client is not connected.");
            call.resolve(ret);
            return;
        }

        JSArray productIdsArray = call.getArray("productIds");
        JSObject productTypes = call.getObject("productTypes");
        List<String> targetIds = new ArrayList<>();

        if (productIdsArray != null) {
            try {
                for (int i = 0; i < productIdsArray.length(); i++) {
                    String id = productIdsArray.getString(i);
                    if (id != null && !id.trim().isEmpty()) {
                        targetIds.add(id.trim());
                    }
                }
            } catch (JSONException e) {
                call.reject("Invalid productIds");
                return;
            }
        }

        JSArray purchases = new JSArray();
        queryOwnedPurchasesForType(BillingClient.ProductType.INAPP, productTypes, targetIds, purchases, (inappResult) -> {
            queryOwnedPurchasesForType(BillingClient.ProductType.SUBS, productTypes, targetIds, purchases, (subsResult) -> {
                JSObject ret = new JSObject();
                boolean ok = inappResult.getResponseCode() == BillingClient.BillingResponseCode.OK
                        && subsResult.getResponseCode() == BillingClient.BillingResponseCode.OK;
                ret.put("ok", ok);
                ret.put("responseCode", ok ? BillingClient.BillingResponseCode.OK : subsResult.getResponseCode());
                ret.put("debugMessage", ok ? "Owned purchases queried." : subsResult.getDebugMessage());
                ret.put("purchases", purchases);
                call.resolve(ret);
            });
        });
    }

    private interface PurchaseQueryDone {
        void done(BillingResult result);
    }

    private void queryOwnedPurchasesForType(
            String productType,
            JSObject productTypes,
            List<String> targetIds,
            JSArray purchases,
            PurchaseQueryDone done
    ) {
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(productType)
                .build();

        billingClient.queryPurchasesAsync(params, (billingResult, list) -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && list != null) {
                for (Purchase purchase : list) {
                    List<String> products = purchase.getProducts();
                    if (!shouldIncludePurchase(productType, productTypes, targetIds, products)) {
                        continue;
                    }

                    JSObject item = new JSObject();
                    JSArray productIds = new JSArray();
                    for (String product : products) {
                        productIds.put(product);
                    }
                    item.put("productIds", productIds);
                    item.put("productId", products != null && !products.isEmpty() ? products.get(0) : "");
                    item.put("purchaseToken", purchase.getPurchaseToken());
                    item.put("orderId", purchase.getOrderId() != null ? purchase.getOrderId() : "");
                    item.put("purchaseState", purchase.getPurchaseState());
                    purchases.put(item);
                }
            }

            done.done(billingResult);
        });
    }

    private boolean shouldIncludePurchase(
            String productType,
            JSObject productTypes,
            List<String> targetIds,
            List<String> products
    ) {
        if (products == null || products.isEmpty()) {
            return false;
        }

        if (targetIds == null || targetIds.isEmpty()) {
            return true;
        }

        for (String product : products) {
            if (targetIds.contains(product)) {
                if (productTypes == null) {
                    return true;
                }
                Object mappedType = productTypes.opt(product);
                return mappedType == null || normalizeProductType(String.valueOf(mappedType)).equals(productType);
            }
        }

        return false;
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        if (savedCall == null) return;

        JSObject ret = new JSObject();
        ret.put("responseCode", billingResult.getResponseCode());
        ret.put("debugMessage", billingResult.getDebugMessage());

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK
                && purchases != null
                && !purchases.isEmpty()) {

            Purchase purchase = purchases.get(0);
            JSArray productIds = new JSArray();
            for (String product : purchase.getProducts()) {
                productIds.put(product);
            }
            ret.put("ok", true);
            ret.put("cancelled", false);
            ret.put("productIds", productIds);
            ret.put("productId", purchase.getProducts() != null && !purchase.getProducts().isEmpty() ? purchase.getProducts().get(0) : "");
            ret.put("purchaseToken", purchase.getPurchaseToken());
            ret.put("orderId", purchase.getOrderId() != null ? purchase.getOrderId() : "");
            ret.put("purchaseState", purchase.getPurchaseState());
            savedCall.resolve(ret);

        } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {

            ret.put("ok", false);
            ret.put("cancelled", true);
            savedCall.resolve(ret);

        } else {

            ret.put("ok", false);
            ret.put("cancelled", false);
            savedCall.resolve(ret);
        }

        savedCall = null;
    }
}
