package com.clara.lifeos.app;

import android.app.Activity;

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
            call.resolve(ret);
            return;
        }

        if (billingClient.isReady()) {
            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("responseCode", BillingClient.BillingResponseCode.OK);
            ret.put("debugMessage", "Billing client already connected.");
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
                call.resolve(ret);
            }

            @Override
            public void onBillingServiceDisconnected() {
                JSObject ret = new JSObject();
                ret.put("ok", false);
                ret.put("responseCode", -1);
                ret.put("debugMessage", "Billing disconnected");
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

            List<ProductDetails> list = result.getProductDetailsList();

            if (list != null) {
                for (ProductDetails pd : list) {
                    found.put(pd.getProductId());
                }
            }

            try {
                for (int i = 0; i < productIdsArray.length(); i++) {
                    String id = productIdsArray.getString(i);
                    boolean exists = false;

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
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void purchaseOneTimeProduct(PluginCall call) {
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
                savedCall.reject("Query failed: " + billingResult.getDebugMessage());
                savedCall = null;
                return;
            }

            List<ProductDetails> list = result.getProductDetailsList();
            if (list == null || list.isEmpty()) {
                savedCall.reject("Product not found");
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
                savedCall.reject("Launch failed: " + launchResult.getDebugMessage());
                savedCall = null;
            }
        });
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
            ret.put("ok", true);
            ret.put("cancelled", false);
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
