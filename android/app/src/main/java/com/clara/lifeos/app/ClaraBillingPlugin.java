package com.clara.lifeos.app;

import android.app.Activity;
import androidx.annotation.NonNull;
import com.android.billingclient.api.AcknowledgePurchaseParams;
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
import java.util.ArrayList;
import java.util.List;
import org.json.JSONException;

@CapacitorPlugin(name = "ClaraBilling")
public class ClaraBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient billingClient;
    private PluginCall purchaseCall;
    private String basePlanId = "";
    private String offerId = "";
    private String offerToken = "";

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .build();
    }

    private String productType(String value) {
        String normalized = value == null ? "" : value.trim().toLowerCase();
        return normalized.equals("subs") || normalized.equals("subscription")
                ? BillingClient.ProductType.SUBS
                : BillingClient.ProductType.INAPP;
    }

    private String purchaseState(Purchase purchase) {
        if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) return "PURCHASED";
        if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) return "PENDING";
        return "UNSPECIFIED";
    }

    private JSObject result(boolean ok, int code, String message) {
        JSObject value = new JSObject();
        value.put("ok", ok);
        value.put("responseCode", code);
        value.put("debugMessage", message == null ? "" : message);
        value.put("billingReady", billingClient != null && billingClient.isReady());
        value.put("packageName", getContext().getPackageName());
        value.put("billingBridge", "ClaraBillingPlugin");
        value.put("pluginVersion", "2026.07.local-entitlement-v1");
        return value;
    }

    private JSObject serializePurchase(Purchase purchase) {
        JSObject value = new JSObject();
        JSArray products = new JSArray();
        for (String product : purchase.getProducts()) products.put(product);
        value.put("productIds", products);
        value.put("productId", purchase.getProducts().isEmpty() ? "" : purchase.getProducts().get(0));
        value.put("purchaseToken", purchase.getPurchaseToken());
        value.put("orderId", purchase.getOrderId() == null ? "" : purchase.getOrderId());
        value.put("purchaseState", purchaseState(purchase));
        value.put("purchaseStateCode", purchase.getPurchaseState());
        value.put("isAcknowledged", purchase.isAcknowledged());
        value.put("purchaseTime", purchase.getPurchaseTime());
        value.put("quantity", purchase.getQuantity());
        value.put("autoRenewing", purchase.isAutoRenewing());
        return value;
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (billingClient == null) {
            call.resolve(result(false, BillingClient.BillingResponseCode.ERROR, "Billing client is not initialized."));
            return;
        }
        if (billingClient.isReady()) {
            call.resolve(result(true, BillingClient.BillingResponseCode.OK, "Billing client already connected."));
            return;
        }
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                call.resolve(result(
                        billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK,
                        billingResult.getResponseCode(),
                        billingResult.getDebugMessage()));
            }

            @Override
            public void onBillingServiceDisconnected() {}
        });
    }

    private ProductDetails.SubscriptionOfferDetails chooseOffer(ProductDetails product) {
        List<ProductDetails.SubscriptionOfferDetails> offers = product.getSubscriptionOfferDetails();
        if (offers == null) return null;
        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
            String id = offer.getBasePlanId() == null ? "" : offer.getBasePlanId().toLowerCase();
            if ((id.equals("committed_249") || id.equals("monthly"))
                    && offer.getOfferToken() != null
                    && !offer.getOfferToken().isEmpty()) return offer;
        }
        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
            if (offer.getOfferToken() != null && !offer.getOfferToken().isEmpty()) return offer;
        }
        return null;
    }

    @PluginMethod
    public void queryProducts(PluginCall call) {
        if (billingClient == null || !billingClient.isReady()) {
            call.resolve(result(false, BillingClient.BillingResponseCode.SERVICE_DISCONNECTED, "Billing client is not connected."));
            return;
        }
        JSArray ids = call.getArray("productIds");
        JSObject types = call.getObject("productTypes");
        if (ids == null || ids.length() == 0) {
            call.reject("Missing productIds");
            return;
        }

        List<QueryProductDetailsParams.Product> requested = new ArrayList<>();
        JSArray queried = new JSArray();
        JSObject queriedTypes = new JSObject();
        try {
            for (int index = 0; index < ids.length(); index++) {
                String id = ids.getString(index);
                if (id == null || id.trim().isEmpty()) continue;
                String type = productType(call.getString("productType"));
                if (types != null && types.opt(id) != null) type = productType(String.valueOf(types.opt(id)));
                requested.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(type).build());
                queried.put(id);
                queriedTypes.put(id, type);
            }
        } catch (JSONException error) {
            call.reject("Invalid productIds");
            return;
        }

        billingClient.queryProductDetailsAsync(
                QueryProductDetailsParams.newBuilder().setProductList(requested).build(),
                (billingResult, queryResult) -> {
                    JSObject response = result(
                            billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK,
                            billingResult.getResponseCode(),
                            billingResult.getDebugMessage());
                    JSArray found = new JSArray();
                    JSArray missing = new JSArray();
                    JSArray details = new JSArray();
                    List<ProductDetails> products = queryResult == null ? null : queryResult.getProductDetailsList();
                    if (products != null) {
                        for (ProductDetails product : products) {
                            found.put(product.getProductId());
                            JSObject detail = new JSObject();
                            detail.put("productId", product.getProductId());
                            detail.put("productType", product.getProductType());
                            detail.put("title", product.getTitle());
                            detail.put("description", product.getDescription());
                            if (BillingClient.ProductType.SUBS.equals(product.getProductType())) {
                                ProductDetails.SubscriptionOfferDetails selected = chooseOffer(product);
                                if (selected != null) {
                                    detail.put("basePlanId", selected.getBasePlanId());
                                    detail.put("offerId", selected.getOfferId() == null ? "" : selected.getOfferId());
                                    detail.put("offerToken", selected.getOfferToken());
                                    if (!selected.getPricingPhases().getPricingPhaseList().isEmpty()) {
                                        ProductDetails.PricingPhase phase = selected.getPricingPhases().getPricingPhaseList().get(0);
                                        detail.put("formattedPrice", phase.getFormattedPrice());
                                        detail.put("priceCurrencyCode", phase.getPriceCurrencyCode());
                                        detail.put("billingPeriod", phase.getBillingPeriod());
                                    }
                                }
                            } else if (product.getOneTimePurchaseOfferDetails() != null) {
                                detail.put("formattedPrice", product.getOneTimePurchaseOfferDetails().getFormattedPrice());
                                detail.put("priceCurrencyCode", product.getOneTimePurchaseOfferDetails().getPriceCurrencyCode());
                            }
                            details.put(detail);
                        }
                    }
                    for (int index = 0; index < queried.length(); index++) {
                        String id = queried.optString(index, "");
                        boolean exists = false;
                        if (products != null) {
                            for (ProductDetails product : products) {
                                if (product.getProductId().equals(id)) exists = true;
                            }
                        }
                        if (!exists) missing.put(id);
                    }
                    response.put("foundProductIds", found);
                    response.put("missingProductIds", missing);
                    response.put("unavailableProductIds", new JSArray());
                    response.put("unavailableProducts", new JSArray());
                    response.put("productDetails", details);
                    response.put("queriedProductIds", queried);
                    response.put("queriedProductTypes", queriedTypes);
                    call.resolve(response);
                });
    }

    @PluginMethod public void purchaseSubscription(PluginCall call) { launch(call); }
    @PluginMethod public void subscribe(PluginCall call) { launch(call); }
    @PluginMethod public void purchaseProduct(PluginCall call) { launch(call); }
    @PluginMethod public void launchPurchase(PluginCall call) { launch(call); }
    @PluginMethod public void purchase(PluginCall call) { launch(call); }
    @PluginMethod public void purchaseOneTimeProduct(PluginCall call) { launch(call); }

    private void launch(PluginCall call) {
        if (billingClient == null || !billingClient.isReady()) {
            call.reject("Billing client is not connected.");
            return;
        }
        String id = call.getString("productId");
        String type = productType(call.getString("productType"));
        if (id == null || id.trim().isEmpty()) {
            call.reject("Missing productId");
            return;
        }

        purchaseCall = call;
        List<QueryProductDetailsParams.Product> requested = new ArrayList<>();
        requested.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(type).build());
        billingClient.queryProductDetailsAsync(
                QueryProductDetailsParams.newBuilder().setProductList(requested).build(),
                (billingResult, queryResult) -> {
                    if (purchaseCall == null) return;
                    List<ProductDetails> products = queryResult == null ? null : queryResult.getProductDetailsList();
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK
                            || products == null || products.isEmpty()) {
                        purchaseCall.reject("Google Play product is unavailable.", String.valueOf(billingResult.getResponseCode()));
                        purchaseCall = null;
                        return;
                    }
                    ProductDetails product = products.get(0);
                    BillingFlowParams.ProductDetailsParams.Builder builder = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product);
                    if (BillingClient.ProductType.SUBS.equals(type)) {
                        ProductDetails.SubscriptionOfferDetails offer = chooseOffer(product);
                        if (offer == null) {
                            purchaseCall.reject("Subscription has no eligible offer.");
                            purchaseCall = null;
                            return;
                        }
                        basePlanId = offer.getBasePlanId();
                        offerId = offer.getOfferId() == null ? "" : offer.getOfferId();
                        offerToken = offer.getOfferToken();
                        builder.setOfferToken(offerToken);
                    }
                    Activity activity = getActivity();
                    if (activity == null) {
                        purchaseCall.reject("Activity is not available.");
                        purchaseCall = null;
                        return;
                    }
                    List<BillingFlowParams.ProductDetailsParams> params = new ArrayList<>();
                    params.add(builder.build());
                    BillingResult launched = billingClient.launchBillingFlow(activity, BillingFlowParams.newBuilder().setProductDetailsParamsList(params).build());
                    if (launched.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        purchaseCall.reject(launched.getDebugMessage(), String.valueOf(launched.getResponseCode()));
                        purchaseCall = null;
                    }
                });
    }

    private interface QueryDone { void done(BillingResult result); }

    private void queryType(String type, List<String> targetIds, JSArray output, QueryDone done) {
        billingClient.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder().setProductType(type).build(),
                (billingResult, purchases) -> {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
                        for (Purchase purchase : purchases) {
                            boolean include = targetIds.isEmpty();
                            for (String product : purchase.getProducts()) {
                                if (targetIds.contains(product)) include = true;
                            }
                            if (include) output.put(serializePurchase(purchase));
                        }
                    }
                    done.done(billingResult);
                });
    }

    @PluginMethod
    public void queryOwnedPurchases(PluginCall call) {
        if (billingClient == null || !billingClient.isReady()) {
            call.resolve(result(false, BillingClient.BillingResponseCode.SERVICE_DISCONNECTED, "Billing client is not connected."));
            return;
        }
        List<String> targetIds = new ArrayList<>();
        JSArray ids = call.getArray("productIds");
        if (ids != null) {
            try {
                for (int index = 0; index < ids.length(); index++) {
                    String id = ids.getString(index);
                    if (id != null && !id.trim().isEmpty()) targetIds.add(id.trim());
                }
            } catch (JSONException error) {
                call.reject("Invalid productIds");
                return;
            }
        }
        JSArray purchases = new JSArray();
        queryType(BillingClient.ProductType.INAPP, targetIds, purchases, inapp ->
                queryType(BillingClient.ProductType.SUBS, targetIds, purchases, subs -> {
                    boolean ok = inapp.getResponseCode() == BillingClient.BillingResponseCode.OK
                            && subs.getResponseCode() == BillingClient.BillingResponseCode.OK;
                    JSObject response = result(ok, ok ? BillingClient.BillingResponseCode.OK : subs.getResponseCode(), ok ? "Owned purchases queried." : subs.getDebugMessage());
                    response.put("purchases", purchases);
                    call.resolve(response);
                }));
    }

    private interface PurchaseFound { void done(Purchase purchase); }

    private void findToken(String type, String token, PurchaseFound done) {
        billingClient.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder().setProductType(type).build(),
                (billingResult, purchases) -> {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
                        for (Purchase purchase : purchases) {
                            if (token.equals(purchase.getPurchaseToken())) {
                                done.done(purchase);
                                return;
                            }
                        }
                    }
                    done.done(null);
                });
    }

    @PluginMethod
    public void acknowledgePurchase(PluginCall call) {
        if (billingClient == null || !billingClient.isReady()) {
            call.resolve(result(false, BillingClient.BillingResponseCode.SERVICE_DISCONNECTED, "Billing client is not connected."));
            return;
        }
        String token = call.getString("purchaseToken");
        if (token == null || token.trim().isEmpty()) {
            call.reject("Missing purchaseToken");
            return;
        }
        findToken(BillingClient.ProductType.SUBS, token.trim(), subscription -> {
            if (subscription != null) {
                acknowledgeVerified(call, subscription);
                return;
            }
            findToken(BillingClient.ProductType.INAPP, token.trim(), oneTime -> {
                if (oneTime != null) acknowledgeVerified(call, oneTime);
                else call.resolve(result(false, BillingClient.BillingResponseCode.ITEM_NOT_OWNED, "Purchase token is not currently owned."));
            });
        });
    }

    private void acknowledgeVerified(PluginCall call, Purchase purchase) {
        if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) {
            JSObject response = result(false, BillingClient.BillingResponseCode.ERROR, "Only PURCHASED transactions can be acknowledged.");
            response.put("purchaseState", purchaseState(purchase));
            call.resolve(response);
            return;
        }
        if (purchase.isAcknowledged()) {
            JSObject response = result(true, BillingClient.BillingResponseCode.OK, "Purchase already acknowledged.");
            response.put("isAcknowledged", true);
            call.resolve(response);
            return;
        }
        billingClient.acknowledgePurchase(
                AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.getPurchaseToken()).build(),
                billingResult -> {
                    JSObject response = result(
                            billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK,
                            billingResult.getResponseCode(),
                            billingResult.getDebugMessage());
                    response.put("isAcknowledged", billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK);
                    call.resolve(response);
                });
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        if (purchaseCall == null) return;
        JSObject response = result(false, billingResult.getResponseCode(), billingResult.getDebugMessage());
        response.put("basePlanId", basePlanId);
        response.put("offerId", offerId);
        response.put("offerToken", offerToken);
        response.put("cancelled", billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED);
        response.put("pending", false);
        response.put("purchaseState", "UNSPECIFIED");

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK
                && purchases != null && !purchases.isEmpty()) {
            Purchase purchase = purchases.get(0);
            JSObject item = serializePurchase(purchase);
            response.put("productIds", item.opt("productIds"));
            response.put("productId", item.opt("productId"));
            response.put("purchaseToken", item.opt("purchaseToken"));
            response.put("orderId", item.opt("orderId"));
            response.put("purchaseState", item.opt("purchaseState"));
            response.put("purchaseStateCode", item.opt("purchaseStateCode"));
            response.put("isAcknowledged", item.opt("isAcknowledged"));
            response.put("purchaseTime", item.opt("purchaseTime"));
            response.put("quantity", item.opt("quantity"));
            boolean purchased = purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED;
            boolean pending = purchase.getPurchaseState() == Purchase.PurchaseState.PENDING;
            response.put("ok", purchased);
            response.put("pending", pending);
            response.put("cancelled", false);
        }

        purchaseCall.resolve(response);
        purchaseCall = null;
        basePlanId = "";
        offerId = "";
        offerToken = "";
    }
}
