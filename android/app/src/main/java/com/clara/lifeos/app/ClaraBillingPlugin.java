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
    private static final String TRIAL_PURCHASE_INTENT = "trial_7d";
    private static final String SEVEN_DAY_TRIAL_UNAVAILABLE_MESSAGE =
            "The 7-day trial offer is not available for this Google Play account yet.";

    private BillingClient billingClient;
    private PluginCall savedCall;
    private String pendingOfferToken = "";
    private String pendingOfferId = "";
    private String pendingBasePlanId = "";
    private boolean pendingTrialOffer = false;

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
        ret.put("pluginVersion", "2026.06.billing-v4-trial-offer-token");
    }

    private void addFeatureDiagnostics(JSObject ret) {
        if (billingClient == null || !billingClient.isReady()) {
            ret.put("productDetailsSupported", false);
            ret.put("subscriptionsSupported", false);
            return;
        }

        BillingResult productDetailsSupport =
                billingClient.isFeatureSupported(BillingClient.FeatureType.PRODUCT_DETAILS);
        BillingResult subscriptionsSupport =
                billingClient.isFeatureSupported(BillingClient.FeatureType.SUBSCRIPTIONS);
        ret.put("productDetailsSupported",
                productDetailsSupport.getResponseCode() == BillingClient.BillingResponseCode.OK);
        ret.put("productDetailsSupportCode", productDetailsSupport.getResponseCode());
        ret.put("productDetailsSupportMessage", productDetailsSupport.getDebugMessage());
        ret.put("subscriptionsSupported",
                subscriptionsSupport.getResponseCode() == BillingClient.BillingResponseCode.OK);
        ret.put("subscriptionsSupportCode", subscriptionsSupport.getResponseCode());
        ret.put("subscriptionsSupportMessage", subscriptionsSupport.getDebugMessage());
    }

    private ProductDetails.SubscriptionOfferDetails firstPurchasableSubscriptionOffer(ProductDetails productDetails) {
        if (productDetails.getSubscriptionOfferDetails() == null) return null;
        for (ProductDetails.SubscriptionOfferDetails offer : productDetails.getSubscriptionOfferDetails()) {
            String token = offer.getOfferToken();
            if (token != null && !token.trim().isEmpty()) return offer;
        }
        return null;
    }

    private boolean isSevenDayBillingPeriod(String billingPeriod) {
        if (billingPeriod == null) return false;
        String normalized = billingPeriod.trim().toUpperCase();
        return "P7D".equals(normalized) || "P1W".equals(normalized);
    }

    private boolean isSevenDayFreeTrialPhase(ProductDetails.PricingPhase phase) {
        return phase != null
                && phase.getPriceAmountMicros() == 0
                && isSevenDayBillingPeriod(phase.getBillingPeriod());
    }

    private boolean offerHasSevenDayFreeTrial(ProductDetails.SubscriptionOfferDetails offer) {
        if (offer == null || offer.getPricingPhases() == null
                || offer.getPricingPhases().getPricingPhaseList() == null) {
            return false;
        }

        for (ProductDetails.PricingPhase phase : offer.getPricingPhases().getPricingPhaseList()) {
            if (isSevenDayFreeTrialPhase(phase)) return true;
        }

        return false;
    }

    private ProductDetails.SubscriptionOfferDetails selectSubscriptionOffer(
            ProductDetails productDetails,
            boolean requireSevenDayTrial
    ) {
        if (productDetails.getSubscriptionOfferDetails() == null
                || productDetails.getSubscriptionOfferDetails().isEmpty()) {
            return null;
        }

        if (requireSevenDayTrial) {
            for (ProductDetails.SubscriptionOfferDetails offer : productDetails.getSubscriptionOfferDetails()) {
                String token = offer.getOfferToken();
                if (token != null && !token.trim().isEmpty() && offerHasSevenDayFreeTrial(offer)) {
                    return offer;
                }
            }
            return null;
        }

        return firstPurchasableSubscriptionOffer(productDetails);
    }

    private void rememberSelectedOffer(ProductDetails.SubscriptionOfferDetails offer, boolean isTrialOffer) {
        pendingOfferToken = offer != null && offer.getOfferToken() != null ? offer.getOfferToken() : "";
        pendingOfferId = offer != null && offer.getOfferId() != null ? offer.getOfferId() : "";
        pendingBasePlanId = offer != null && offer.getBasePlanId() != null ? offer.getBasePlanId() : "";
        pendingTrialOffer = isTrialOffer;
    }

    private void resetPendingOffer() {
        pendingOfferToken = "";
        pendingOfferId = "";
        pendingBasePlanId = "";
        pendingTrialOffer = false;
    }

    private JSObject serializePricingPhase(ProductDetails.PricingPhase phase) {
        JSObject item = new JSObject();
        item.put("formattedPrice", phase.getFormattedPrice());
        item.put("priceCurrencyCode", phase.getPriceCurrencyCode());
        item.put("priceAmountMicros", phase.getPriceAmountMicros());
        item.put("billingPeriod", phase.getBillingPeriod());
        item.put("isSevenDayBillingPeriod", isSevenDayBillingPeriod(phase.getBillingPeriod()));
        item.put("recurrenceMode", phase.getRecurrenceMode());
        item.put("billingCycleCount", phase.getBillingCycleCount());
        item.put("isSevenDayFreeTrial", isSevenDayFreeTrialPhase(phase));
        return item;
    }

    private JSObject serializeSubscriptionOffer(ProductDetails.SubscriptionOfferDetails offer) {
        JSObject offerDetail = new JSObject();
        offerDetail.put("basePlanId", offer.getBasePlanId());
        offerDetail.put("offerId", offer.getOfferId() != null ? offer.getOfferId() : "");
        offerDetail.put("offerToken", offer.getOfferToken());
        offerDetail.put("hasSevenDayFreeTrial", offerHasSevenDayFreeTrial(offer));

        JSArray phases = new JSArray();
        if (offer.getPricingPhases() != null && offer.getPricingPhases().getPricingPhaseList() != null) {
            for (ProductDetails.PricingPhase phase : offer.getPricingPhases().getPricingPhaseList()) {
                phases.put(serializePricingPhase(phase));
            }
        }
        offerDetail.put("pricingPhases", phases);
        return offerDetail;
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
            Log.d(TAG, "connect reused ready billing client for " + getContext().getPackageName());
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
                Log.d(TAG, "connect result code=" + billingResult.getResponseCode()
                        + " message=" + billingResult.getDebugMessage()
                        + " package=" + getContext().getPackageName()
                        + " installer=" + getInstallerPackageName());
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
        if (billingClient == null) {
            JSObject ret = new JSObject();
            ret.put("ok", false);
            ret.put("responseCode", "ERROR");
            ret.put("debugMessage", "Billing client is not initialized.");
            addDeviceDiagnostics(ret);
            addFeatureDiagnostics(ret);
            call.resolve(ret);
            return;
        }

        if (!billingClient.isReady()) {
            JSObject ret = new JSObject();
            ret.put("ok", false);
            ret.put("responseCode", -1);
            ret.put("debugMessage", "Billing client is not connected.");
            addDeviceDiagnostics(ret);
            addFeatureDiagnostics(ret);
            call.resolve(ret);
            return;
        }

        BillingResult productDetailsSupport =
                billingClient.isFeatureSupported(BillingClient.FeatureType.PRODUCT_DETAILS);
        if (productDetailsSupport.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            JSObject ret = new JSObject();
            ret.put("ok", false);
            ret.put("responseCode", productDetailsSupport.getResponseCode());
            ret.put("debugMessage", "ProductDetails is not supported on this device: "
                    + productDetailsSupport.getDebugMessage());
            addDeviceDiagnostics(ret);
            addFeatureDiagnostics(ret);
            Log.w(TAG, "queryProducts blocked because ProductDetails is unsupported. code="
                    + productDetailsSupport.getResponseCode()
                    + " message=" + productDetailsSupport.getDebugMessage());
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
        List<String> queryLog = new ArrayList<>();

        try {
            for (int i = 0; i < productIdsArray.length(); i++) {
                String id = productIdsArray.getString(i);
                if (id != null && !id.trim().isEmpty()) {
                    String productType = fallbackProductType;
                    if (productTypes != null) {
                        Object mappedType = productTypes.opt(id.trim());
                        if (mappedType != null) productType = normalizeProductType(String.valueOf(mappedType));
                    }
                    queryLog.add(id.trim() + ":" + productType);
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

        Log.d(TAG, "queryProducts start " + queryLog);
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
                        boolean hasSevenDayTrial = false;
                        for (ProductDetails.SubscriptionOfferDetails offer : pd.getSubscriptionOfferDetails()) {
                            if (offerHasSevenDayFreeTrial(offer)) hasSevenDayTrial = true;
                            offerDetails.put(serializeSubscriptionOffer(offer));
                        }

                        ProductDetails.SubscriptionOfferDetails firstOffer = firstPurchasableSubscriptionOffer(pd);
                        if (firstOffer != null
                                && firstOffer.getPricingPhases() != null
                                && firstOffer.getPricingPhases().getPricingPhaseList() != null
                                && !firstOffer.getPricingPhases().getPricingPhaseList().isEmpty()) {
                            ProductDetails.PricingPhase phase = firstOffer.getPricingPhases().getPricingPhaseList().get(0);
                            detail.put("formattedPrice", phase.getFormattedPrice());
                            detail.put("priceCurrencyCode", phase.getPriceCurrencyCode());
                            detail.put("billingPeriod", phase.getBillingPeriod());
                        }

                        detail.put("basePlanId", firstOffer != null ? firstOffer.getBasePlanId() : "");
                        detail.put("offerToken", firstOffer != null ? firstOffer.getOfferToken() : "");
                        detail.put("offerId", firstOffer != null && firstOffer.getOfferId() != null ? firstOffer.getOfferId() : "");
                        detail.put("offerCount", pd.getSubscriptionOfferDetails().size());
                        detail.put("hasSevenDayTrialOffer", hasSevenDayTrial);
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
                    Log.w(TAG, "queryProducts unfetched productId=" + product.getProductId()
                            + " type=" + product.getProductType()
                            + " status=" + product.getStatusCode()
                            + " detail=" + product.toString());
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
                        if (mappedType != null) productType = normalizeProductType(String.valueOf(mappedType));
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

                    if (!exists) missing.put(id);
                }
            } catch (JSONException ignored) {
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
            Log.d(TAG, "queryProducts result code=" + billingResult.getResponseCode()
                    + " message=" + billingResult.getDebugMessage()
                    + " found=" + found
                    + " missing=" + missing
                    + " unavailable=" + unavailable);
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
            Log.w(TAG, "purchase blocked: billing client is not initialized");
            return;
        }

        if (!billingClient.isReady()) {
            call.reject("Billing client is not connected.");
            Log.w(TAG, "purchase blocked: billing client is not connected");
            return;
        }

        String productId = call.getString("productId");
        String productType = normalizeProductType(call.getString("productType"));
        String purchaseIntent = call.getString("purchaseIntent", "");
        Boolean requireTrialFlag = call.getBoolean("requireFreeTrialOffer", false);
        Integer trialDaysValue = call.getInt("trialDays", 0);
        int trialDays = trialDaysValue != null ? trialDaysValue : 0;
        boolean requireSevenDayTrial = Boolean.TRUE.equals(requireTrialFlag)
                || TRIAL_PURCHASE_INTENT.equals(purchaseIntent)
                || trialDays == 7;

        if (productId == null || productId.trim().isEmpty()) {
            call.reject("Missing productId");
            return;
        }

        BillingResult productDetailsSupport =
                billingClient.isFeatureSupported(BillingClient.FeatureType.PRODUCT_DETAILS);
        if (productDetailsSupport.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            call.reject(
                    "ProductDetails is not supported on this device: "
                            + productDetailsSupport.getDebugMessage(),
                    String.valueOf(productDetailsSupport.getResponseCode())
            );
            Log.w(TAG, "purchase blocked: ProductDetails unsupported code="
                    + productDetailsSupport.getResponseCode()
                    + " message=" + productDetailsSupport.getDebugMessage());
            return;
        }

        savedCall = call;
        resetPendingOffer();

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

        Log.d(TAG, "purchase query start productId=" + productId.trim()
                + " type=" + productType
                + " purchaseIntent=" + purchaseIntent
                + " requireSevenDayTrial=" + requireSevenDayTrial);
        billingClient.queryProductDetailsAsync(params, (billingResult, result) -> {
            if (savedCall == null) return;

            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                Log.w(TAG, "purchase query failed code=" + billingResult.getResponseCode()
                        + " message=" + billingResult.getDebugMessage());
                savedCall.reject("Query failed: " + billingResult.getDebugMessage(), String.valueOf(billingResult.getResponseCode()));
                savedCall = null;
                resetPendingOffer();
                return;
            }

            if (result != null && result.getUnfetchedProductList() != null && !result.getUnfetchedProductList().isEmpty()) {
                for (UnfetchedProduct product : result.getUnfetchedProductList()) {
                    Log.w(TAG, "purchase query unfetched productId=" + product.getProductId()
                            + " type=" + product.getProductType()
                            + " status=" + product.getStatusCode()
                            + " detail=" + product.toString());
                }
            }

            List<ProductDetails> list = result != null ? result.getProductDetailsList() : null;
            if (list == null || list.isEmpty()) {
                Log.w(TAG, "purchase query returned no ProductDetails for productId="
                        + productId.trim() + " type=" + productType);
                savedCall.reject("Product not found: " + productId.trim(), String.valueOf(BillingClient.BillingResponseCode.ITEM_UNAVAILABLE));
                savedCall = null;
                resetPendingOffer();
                return;
            }

            ProductDetails productDetails = list.get(0);
            Log.d(TAG, "purchase query returned productId=" + productDetails.getProductId()
                    + " type=" + productDetails.getProductType()
                    + " offerCount="
                    + (productDetails.getSubscriptionOfferDetails() == null
                    ? 0
                    : productDetails.getSubscriptionOfferDetails().size()));

            List<BillingFlowParams.ProductDetailsParams> paramsList = new ArrayList<>();
            BillingFlowParams.ProductDetailsParams.Builder detailsBuilder =
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(productDetails);

            if (BillingClient.ProductType.SUBS.equals(productType)) {
                ProductDetails.SubscriptionOfferDetails selectedOffer =
                        selectSubscriptionOffer(productDetails, requireSevenDayTrial);

                if (selectedOffer == null) {
                    String message = requireSevenDayTrial
                            ? SEVEN_DAY_TRIAL_UNAVAILABLE_MESSAGE
                            : "Subscription has no eligible base plan/offer for this user: " + productId.trim();
                    savedCall.reject(message, String.valueOf(BillingClient.BillingResponseCode.ITEM_UNAVAILABLE));
                    Log.w(TAG, "purchase blocked: " + message + " productId=" + productId.trim());
                    savedCall = null;
                    resetPendingOffer();
                    return;
                }

                boolean selectedTrialOffer = offerHasSevenDayFreeTrial(selectedOffer);
                if (requireSevenDayTrial && !selectedTrialOffer) {
                    savedCall.reject(SEVEN_DAY_TRIAL_UNAVAILABLE_MESSAGE, String.valueOf(BillingClient.BillingResponseCode.ITEM_UNAVAILABLE));
                    Log.w(TAG, "purchase blocked: selected offer is not a free P7D/P1W trial productId=" + productId.trim());
                    savedCall = null;
                    resetPendingOffer();
                    return;
                }

                rememberSelectedOffer(selectedOffer, selectedTrialOffer);
                detailsBuilder.setOfferToken(selectedOffer.getOfferToken());
            }

            paramsList.add(detailsBuilder.build());

            BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(paramsList)
                    .build();

            Activity activity = getActivity();
            if (activity == null) {
                savedCall.reject("Activity is not available.");
                savedCall = null;
                resetPendingOffer();
                return;
            }

            BillingResult launchResult = billingClient.launchBillingFlow(activity, flowParams);
            if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                Log.w(TAG, "launchBillingFlow failed code=" + launchResult.getResponseCode()
                        + " message=" + launchResult.getDebugMessage());
                savedCall.reject("Launch failed: " + launchResult.getDebugMessage(), String.valueOf(launchResult.getResponseCode()));
                savedCall = null;
                resetPendingOffer();
            } else {
                Log.d(TAG, "launchBillingFlow started productId=" + productId.trim()
                        + " basePlanId=" + pendingBasePlanId
                        + " offerId=" + pendingOfferId
                        + " trialOffer=" + pendingTrialOffer);
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

    private boolean shouldIncludePurchase(
            String productType,
            JSObject productTypes,
            List<String> targetIds,
            List<String> products
    ) {
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
        ret.put("trialOffer", pendingTrialOffer);

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK
                && purchases != null
                && !purchases.isEmpty()) {

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
        resetPendingOffer();
    }
}
