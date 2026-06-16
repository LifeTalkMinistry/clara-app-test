package com.clara.lifeos.app;

import android.app.Activity;
import android.content.pm.PackageManager;
import android.util.Log;
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
import com.android.billingclient.api.UnfetchedProduct;
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
    private static final String TAG = "ClaraBilling";
    private BillingClient billingClient;
    private PluginCall savedCall;
    private String pendingOfferToken = "";
    private String pendingOfferId = "";
    private String pendingBasePlanId = "";

    private String normalizeProductType(String value) {
        if (value == null) return BillingClient.ProductType.INAPP;
        String normalized = value.trim().toLowerCase();
        return normalized.equals("subs") || normalized.equals("subscription") ? BillingClient.ProductType.SUBS : BillingClient.ProductType.INAPP;
    }

    private String getInstallerPackageName() {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                return getContext().getPackageManager().getInstallSourceInfo(getContext().getPackageName()).getInstallingPackageName();
            }
            return getContext().getPackageManager().getInstallerPackageName(getContext().getPackageName());
        } catch (PackageManager.NameNotFoundException | RuntimeException ignored) {
            return "";
        }
    }

    private boolean isPackageInstalled(String packageName) {
        try {
            getContext().getPackageManager().getPackageInfo(packageName, 0);
            return true;
        } catch (PackageManager.NameNotFoundException | RuntimeException ignored) {
            return false;
        }
    }

    private void addDeviceDiagnostics(JSObject ret) {
        String installer = getInstallerPackageName();
        ret.put("packageName", getContext().getPackageName());
        ret.put("installerPackageName", installer);
        ret.put("isAppFromPlay", "com.android.vending".equals(installer));
        ret.put("isPlayStoreInstalled", isPackageInstalled("com.android.vending"));
        ret.put("isGooglePlayServicesAvailable", isPackageInstalled("com.google.android.gms"));
        ret.put("billingReady", billingClient != null && billingClient.isReady());
        ret.put("billingBridge", "ClaraBillingPlugin");
        ret.put("pluginVersion", "2026.06.billing-v5-monthly-direct");
    }

    private void addFeatureDiagnostics(JSObject ret) {
        if (billingClient == null || !billingClient.isReady()) {
            ret.put("productDetailsSupported", false);
            ret.put("subscriptionsSupported", false);
            return;
        }
        BillingResult productDetailsSupport = billingClient.isFeatureSupported(BillingClient.FeatureType.PRODUCT_DETAILS);
        BillingResult subscriptionsSupport = billingClient.isFeatureSupported(BillingClient.FeatureType.SUBSCRIPTIONS);
        ret.put("productDetailsSupported", productDetailsSupport.getResponseCode() == BillingClient.BillingResponseCode.OK);
        ret.put("productDetailsSupportCode", productDetailsSupport.getResponseCode());
        ret.put("productDetailsSupportMessage", productDetailsSupport.getDebugMessage());
        ret.put("subscriptionsSupported", subscriptionsSupport.getResponseCode() == BillingClient.BillingResponseCode.OK);
        ret.put("subscriptionsSupportCode", subscriptionsSupport.getResponseCode());
        ret.put("subscriptionsSupportMessage", subscriptionsSupport.getDebugMessage());
    }

    private boolean hasPurchasableOfferToken(ProductDetails.SubscriptionOfferDetails offer) {
        return offer != null && offer.getOfferToken() != null && !offer.getOfferToken().trim().isEmpty();
    }

    private boolean isPreferredBasePlan(ProductDetails.SubscriptionOfferDetails offer) {
        String basePlanId = offer != null && offer.getBasePlanId() != null ? offer.getBasePlanId().trim().toLowerCase() : "";
        return "committed_249".equals(basePlanId) || "monthly".equals(basePlanId);
    }

    private ProductDetails.SubscriptionOfferDetails selectSubscriptionOffer(ProductDetails productDetails) {
        if (productDetails.getSubscriptionOfferDetails() == null || productDetails.getSubscriptionOfferDetails().isEmpty()) return null;
        for (ProductDetails.SubscriptionOfferDetails offer : productDetails.getSubscriptionOfferDetails()) {
            if (hasPurchasableOfferToken(offer) && isPreferredBasePlan(offer)) return offer;
        }
        for (ProductDetails.SubscriptionOfferDetails offer : productDetails.getSubscriptionOfferDetails()) {
            if (hasPurchasableOfferToken(offer)) return offer;
        }
        return null;
    }

    private void rememberSelectedOffer(ProductDetails.SubscriptionOfferDetails offer) {
        pendingOfferToken = offer != null && offer.getOfferToken() != null ? offer.getOfferToken() : "";
        pendingOfferId = offer != null && offer.getOfferId() != null ? offer.getOfferId() : "";
        pendingBasePlanId = offer != null && offer.getBasePlanId() != null ? offer.getBasePlanId() : "";
    }

    private void resetPendingOffer() {
        pendingOfferToken = "";
        pendingOfferId = "";
        pendingBasePlanId = "";
    }

    private JSObject serializePricingPhase(ProductDetails.PricingPhase phase) {
        JSObject item = new JSObject();
        item.put("formattedPrice", phase.getFormattedPrice());
        item.put("priceCurrencyCode", phase.getPriceCurrencyCode());
        item.put("priceAmountMicros", phase.getPriceAmountMicros());
        item.put("billingPeriod", phase.getBillingPeriod());
        item.put("recurrenceMode", phase.getRecurrenceMode());
        item.put("billingCycleCount", phase.getBillingCycleCount());
        return item;
    }

    private JSObject serializeSubscriptionOffer(ProductDetails.SubscriptionOfferDetails offer) {
        JSObject offerDetail = new JSObject();
        offerDetail.put("basePlanId", offer.getBasePlanId());
        offerDetail.put("offerId", offer.getOfferId() != null ? offer.getOfferId() : "");
        offerDetail.put("offerToken", offer.getOfferToken());
        JSArray phases = new JSArray();
        if (offer.getPricingPhases() != null && offer.getPricingPhases().getPricingPhaseList() != null) {
            for (ProductDetails.PricingPhase phase : offer.getPricingPhases().getPricingPhaseList()) phases.put(serializePricingPhase(phase));
        }
        offerDetail.put("pricingPhases", phases);
        return offerDetail;
    }

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
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
            addFeatureDiagnostics(ret);
            Log.w(TAG, "connect failed: billing client is not initialized");
            call.resolve(ret);
            return;
        }
        if (billingClient.isReady()) {
            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("responseCode", BillingClient.BillingResponseCode.OK);
            ret.put("debugMessage", "Billing client already connected.");
            addDeviceDiagnostics(ret);
            addFeatureDiagnostics(ret);
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
                addFeatureDiagnostics(ret);
                call.resolve(ret);
            }
            @Override
            public void onBillingServiceDisconnected() {
                Log.w(TAG, "billing service disconnected");
            }
        });
    }

    @PluginMethod
    public void queryProducts(PluginCall call) {
        if (billingClient == null || !billingClient.isReady()) {
            JSObject ret = new JSObject();
            ret.put("ok", false);
            ret.put("responseCode", billingClient == null ? "ERROR" : -1);
            ret.put("debugMessage", billingClient == null ? "Billing client is not initialized." : "Billing client is not connected.");
            addDeviceDiagnostics(ret);
            addFeatureDiagnostics(ret);
            call.resolve(ret);
            return;
        }
        BillingResult productDetailsSupport = billingClient.isFeatureSupported(BillingClient.FeatureType.PRODUCT_DETAILS);
        if (productDetailsSupport.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            JSObject ret = new JSObject();
            ret.put("ok", false);
            ret.put("responseCode", productDetailsSupport.getResponseCode());
            ret.put("debugMessage", "ProductDetails is not supported on this device: " + productDetailsSupport.getDebugMessage());
            addDeviceDiagnostics(ret);
            addFeatureDiagnostics(ret);
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
        JSArray queried = new JSArray();
        JSObject queriedTypes = new JSObject();
        try {
            for (int i = 0; i < productIdsArray.length(); i++) {
                String id = productIdsArray.getString(i);
                if (id == null || id.trim().isEmpty()) continue;
                String cleanId = id.trim();
                String productType = fallbackProductType;
                if (productTypes != null) {
                    Object mappedType = productTypes.opt(cleanId);
                    if (mappedType != null) productType = normalizeProductType(String.valueOf(mappedType));
                }
                queried.put(cleanId);
                queriedTypes.put(cleanId, productType);
                productList.add(QueryProductDetailsParams.Product.newBuilder().setProductId(cleanId).setProductType(productType).build());
            }
        } catch (JSONException e) {
            call.reject("Invalid productIds");
            return;
        }
        if (productList.isEmpty()) {
            call.reject("No valid productIds provided");
            return;
        }
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(productList).build();
        billingClient.queryProductDetailsAsync(params, (billingResult, result) -> {
            JSObject ret = new JSObject();
            ret.put("ok", billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK);
            ret.put("responseCode", billingResult.getResponseCode());
            ret.put("debugMessage", billingResult.getDebugMessage());
            JSArray found = new JSArray();
            JSArray missing = new JSArray();
            JSArray details = new JSArray();
            JSArray unavailable = new JSArray();
            JSArray unavailableIds = new JSArray();
            List<ProductDetails> list = result != null ? result.getProductDetailsList() : null;
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
                        JSArray offerDetails = new JSArray();
                        for (ProductDetails.SubscriptionOfferDetails offer : pd.getSubscriptionOfferDetails()) offerDetails.put(serializeSubscriptionOffer(offer));
                        ProductDetails.SubscriptionOfferDetails selectedOffer = selectSubscriptionOffer(pd);
                        if (selectedOffer != null && selectedOffer.getPricingPhases() != null && selectedOffer.getPricingPhases().getPricingPhaseList() != null && !selectedOffer.getPricingPhases().getPricingPhaseList().isEmpty()) {
                            ProductDetails.PricingPhase phase = selectedOffer.getPricingPhases().getPricingPhaseList().get(0);
                            detail.put("formattedPrice", phase.getFormattedPrice());
                            detail.put("priceCurrencyCode", phase.getPriceCurrencyCode());
                            detail.put("billingPeriod", phase.getBillingPeriod());
                        }
                        detail.put("basePlanId", selectedOffer != null ? selectedOffer.getBasePlanId() : "");
                        detail.put("offerToken", selectedOffer != null ? selectedOffer.getOfferToken() : "");
                        detail.put("offerId", selectedOffer != null && selectedOffer.getOfferId() != null ? selectedOffer.getOfferId() : "");
                        detail.put("offerCount", pd.getSubscriptionOfferDetails().size());
                        detail.put("subscriptionOfferDetails", offerDetails);
                    } else if (BillingClient.ProductType.SUBS.equals(pd.getProductType())) {
                        JSObject item = new JSObject();
                        item.put("productId", pd.getProductId());
                        item.put("productType", pd.getProductType());
                        item.put("statusCode", BillingClient.BillingResponseCode.ITEM_UNAVAILABLE);
                        item.put("reason", "Subscription was returned without an eligible base plan/offer token for this user.");
                        unavailable.put(item);
                        unavailableIds.put(pd.getProductId());
                    } else if (pd.getOneTimePurchaseOfferDetails() != null) {
                        detail.put("formattedPrice", pd.getOneTimePurchaseOfferDetails().getFormattedPrice());
                        detail.put("priceCurrencyCode", pd.getOneTimePurchaseOfferDetails().getPriceCurrencyCode());
                    }
                    details.put(detail);
                }
            }
            if (result != null && result.getUnfetchedProductList() != null) {
                for (UnfetchedProduct product : result.getUnfetchedProductList()) {
                    JSObject item = new JSObject();
                    item.put("productId", product.getProductId());
                    item.put("productType", product.getProductType());
                    item.put("statusCode", product.getStatusCode());
                    item.put("serializedDocid", product.getSerializedDocid());
                    item.put("reason", product.toString());
                    unavailable.put(item);
                    unavailableIds.put(product.getProductId());
                }
            }
            for (int i = 0; i < queried.length(); i++) {
                String id = queried.optString(i, "");
                boolean exists = false;
                if (list != null) for (ProductDetails pd : list) if (pd.getProductId().equals(id)) exists = true;
                if (!exists) missing.put(id);
            }
            ret.put("foundProductIds", found);
            ret.put("missingProductIds", missing);
            ret.put("queriedProductIds", queried);
            ret.put("queriedProductTypes", queriedTypes);
            ret.put("productDetails", details);
            ret.put("unavailableProductIds", unavailableIds);
            ret.put("unavailableProducts", unavailable);
            addDeviceDiagnostics(ret);
            addFeatureDiagnostics(ret);
            call.resolve(ret);
        });
    }

    @PluginMethod public void purchaseOneTimeProduct(PluginCall call) { launchProductPurchase(call); }
    @PluginMethod public void purchaseSubscription(PluginCall call) { launchProductPurchase(call); }
    @PluginMethod public void subscribe(PluginCall call) { launchProductPurchase(call); }
    @PluginMethod public void purchaseProduct(PluginCall call) { launchProductPurchase(call); }
    @PluginMethod public void launchPurchase(PluginCall call) { launchProductPurchase(call); }
    @PluginMethod public void purchase(PluginCall call) { launchProductPurchase(call); }

    private void launchProductPurchase(PluginCall call) {
        if (billingClient == null || !billingClient.isReady()) {
            call.reject(billingClient == null ? "Billing client is not initialized." : "Billing client is not connected.");
            return;
        }
        String productId = call.getString("productId");
        String productType = normalizeProductType(call.getString("productType"));
        if (productId == null || productId.trim().isEmpty()) {
            call.reject("Missing productId");
            return;
        }
        BillingResult productDetailsSupport = billingClient.isFeatureSupported(BillingClient.FeatureType.PRODUCT_DETAILS);
        if (productDetailsSupport.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            call.reject("ProductDetails is not supported on this device: " + productDetailsSupport.getDebugMessage(), String.valueOf(productDetailsSupport.getResponseCode()));
            return;
        }
        savedCall = call;
        resetPendingOffer();
        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        productList.add(QueryProductDetailsParams.Product.newBuilder().setProductId(productId.trim()).setProductType(productType).build());
        billingClient.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(productList).build(), (billingResult, result) -> {
            if (savedCall == null) return;
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                savedCall.reject("Query failed: " + billingResult.getDebugMessage(), String.valueOf(billingResult.getResponseCode()));
                savedCall = null;
                resetPendingOffer();
                return;
            }
            List<ProductDetails> list = result != null ? result.getProductDetailsList() : null;
            if (list == null || list.isEmpty()) {
                savedCall.reject("Product not found: " + productId.trim(), String.valueOf(BillingClient.BillingResponseCode.ITEM_UNAVAILABLE));
                savedCall = null;
                resetPendingOffer();
                return;
            }
            ProductDetails productDetails = list.get(0);
            BillingFlowParams.ProductDetailsParams.Builder detailsBuilder = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(productDetails);
            if (BillingClient.ProductType.SUBS.equals(productType)) {
                ProductDetails.SubscriptionOfferDetails selectedOffer = selectSubscriptionOffer(productDetails);
                if (selectedOffer == null) {
                    savedCall.reject("Subscription has no eligible base plan/offer for this user: " + productId.trim(), String.valueOf(BillingClient.BillingResponseCode.ITEM_UNAVAILABLE));
                    savedCall = null;
                    resetPendingOffer();
                    return;
                }
                rememberSelectedOffer(selectedOffer);
                detailsBuilder.setOfferToken(selectedOffer.getOfferToken());
            }
            Activity activity = getActivity();
            if (activity == null) {
                savedCall.reject("Activity is not available.");
                savedCall = null;
                resetPendingOffer();
                return;
            }
            List<BillingFlowParams.ProductDetailsParams> paramsList = new ArrayList<>();
            paramsList.add(detailsBuilder.build());
            BillingResult launchResult = billingClient.launchBillingFlow(activity, BillingFlowParams.newBuilder().setProductDetailsParamsList(paramsList).build());
            if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                savedCall.reject("Launch failed: " + launchResult.getDebugMessage(), String.valueOf(launchResult.getResponseCode()));
                savedCall = null;
                resetPendingOffer();
            }
        });
    }

    @PluginMethod
    public void queryOwnedPurchases(PluginCall call) {
        if (billingClient == null || !billingClient.isReady()) {
            JSObject ret = new JSObject();
            ret.put("ok", false);
            ret.put("responseCode", billingClient == null ? "ERROR" : -1);
            ret.put("debugMessage", billingClient == null ? "Billing client is not initialized." : "Billing client is not connected.");
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
                    if (id != null && !id.trim().isEmpty()) targetIds.add(id.trim());
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
                boolean ok = inappResult.getResponseCode() == BillingClient.BillingResponseCode.OK && subsResult.getResponseCode() == BillingClient.BillingResponseCode.OK;
                ret.put("ok", ok);
                ret.put("responseCode", ok ? BillingClient.BillingResponseCode.OK : subsResult.getResponseCode());
                ret.put("debugMessage", ok ? "Owned purchases queried." : subsResult.getDebugMessage());
                ret.put("purchases", purchases);
                call.resolve(ret);
            });
        });
    }

    private interface PurchaseQueryDone { void done(BillingResult result); }

    private void queryOwnedPurchasesForType(String productType, JSObject productTypes, List<String> targetIds, JSArray purchases, PurchaseQueryDone done) {
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder().setProductType(productType).build();
        billingClient.queryPurchasesAsync(params, (billingResult, list) -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && list != null) {
                for (Purchase purchase : list) {
                    List<String> products = purchase.getProducts();
                    if (!shouldIncludePurchase(productType, productTypes, targetIds, products)) continue;
                    JSObject item = new JSObject();
                    JSArray productIds = new JSArray();
                    for (String product : products) productIds.put(product);
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

    private boolean shouldIncludePurchase(String productType, JSObject productTypes, List<String> targetIds, List<String> products) {
        if (products == null || products.isEmpty()) return false;
        if (targetIds == null || targetIds.isEmpty()) return true;
        for (String product : products) {
            if (targetIds.contains(product)) {
                if (productTypes == null) return true;
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
        ret.put("basePlanId", pendingBasePlanId);
        ret.put("offerId", pendingOfferId);
        ret.put("offerToken", pendingOfferToken);
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null && !purchases.isEmpty()) {
            Purchase purchase = purchases.get(0);
            JSArray productIds = new JSArray();
            for (String product : purchase.getProducts()) productIds.put(product);
            ret.put("ok", true);
            ret.put("cancelled", false);
            ret.put("productIds", productIds);
            ret.put("productId", purchase.getProducts() != null && !purchase.getProducts().isEmpty() ? purchase.getProducts().get(0) : "");
            ret.put("purchaseToken", purchase.getPurchaseToken());
            ret.put("orderId", purchase.getOrderId() != null ? purchase.getOrderId() : "");
            ret.put("purchaseState", purchase.getPurchaseState());
        } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            ret.put("ok", false);
            ret.put("cancelled", true);
        } else {
            ret.put("ok", false);
            ret.put("cancelled", false);
        }
        savedCall.resolve(ret);
        savedCall = null;
        resetPendingOffer();
    }
}
