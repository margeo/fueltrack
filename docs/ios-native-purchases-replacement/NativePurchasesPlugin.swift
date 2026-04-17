// NativePurchasesPlugin.swift
//
// Custom replacement for @capgo/native-purchases@8.3.3 which has Swift compile
// errors against capacitor-swift-pm 8.3.1 (Missing argument / no member 'reject').
// See docs/ios-native-purchases-replacement/README.md for install instructions.
//
// Implements exactly the 4 methods that src/utils/iosIAP.js uses. Registers under
// the same JS name ("NativePurchases") so the frontend code doesn't need to
// change at all — it just calls the capacitor runtime normally and the bridge
// routes to this class instead of the broken node_module.
//
// Uses call.options raw dictionary access instead of call.getString/getArray
// so we don't depend on the Capacitor swift API surface that the capgo plugin
// can't find.

import Foundation
import Capacitor
import StoreKit
import UIKit

@objc(NativePurchasesPlugin)
public class NativePurchasesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativePurchasesPlugin"
    public let jsName = "NativePurchases"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchaseProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manageSubscriptions", returnType: CAPPluginReturnPromise),
    ]

    // MARK: - getProducts({ productIdentifiers: [String] })

    @objc func getProducts(_ call: CAPPluginCall) {
        let productIds = (call.options["productIdentifiers"] as? [String]) ?? []
        guard !productIds.isEmpty else {
            call.reject("productIdentifiers missing or empty")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: Set(productIds))
                let payload: [[String: Any]] = products.map { product in
                    [
                        "productIdentifier": product.id,
                        "identifier": product.id,
                        "displayName": product.displayName,
                        "localizedTitle": product.displayName,
                        "localizedDescription": product.description,
                        "description": product.description,
                        "displayPrice": product.displayPrice,
                        "priceString": product.displayPrice,
                        "price": NSDecimalNumber(decimal: product.price).doubleValue,
                        "currencyCode": product.priceFormatStyle.currencyCode
                    ]
                }
                call.resolve(["products": payload])
            } catch {
                call.reject("Failed to fetch products: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - purchaseProduct({ productIdentifier, productType, appAccountToken? })

    @objc func purchaseProduct(_ call: CAPPluginCall) {
        guard let productId = call.options["productIdentifier"] as? String, !productId.isEmpty else {
            call.reject("productIdentifier required")
            return
        }
        let appAccountTokenStr = call.options["appAccountToken"] as? String

        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not found: \(productId)")
                    return
                }

                var options: Set<Product.PurchaseOption> = []
                if let tokenStr = appAccountTokenStr,
                   !tokenStr.isEmpty,
                   let uuid = UUID(uuidString: tokenStr) {
                    options.insert(.appAccountToken(uuid))
                }

                let result = try await product.purchase(options: options)

                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        // Apple requires transactions to be finished once the app
                        // has delivered the purchased content. Since we record
                        // is_paid in Supabase via server-side receipt validation
                        // POSTed from the frontend, we finish here and let the
                        // caller handle the JWS validation round-trip.
                        await transaction.finish()
                        call.resolve([
                            "productIdentifier": product.id,
                            "transactionId": String(transaction.id),
                            "originalTransactionId": String(transaction.originalID),
                            "jwsRepresentation": verification.jwsRepresentation,
                            "purchaseDate": ISO8601DateFormatter().string(from: transaction.purchaseDate)
                        ])
                    case .unverified(_, let error):
                        call.reject("Transaction unverified: \(error.localizedDescription)")
                    }
                case .userCancelled:
                    call.reject("User cancelled purchase")
                case .pending:
                    // Ask-to-buy (family approval) or SCA pending. Surface as a
                    // reject so the UI shows "try again later" instead of a
                    // false-positive success.
                    call.reject("Purchase pending approval")
                @unknown default:
                    call.reject("Unknown purchase result")
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - restorePurchases()

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                // Force a fresh sync with the App Store before reading
                // currentEntitlements, otherwise a user who just purchased on
                // another device might not see their subscription here yet.
                try await AppStore.sync()

                var transactions: [[String: Any]] = []
                for await result in Transaction.currentEntitlements {
                    if case .verified(let tx) = result {
                        transactions.append([
                            "productIdentifier": tx.productID,
                            "transactionId": String(tx.id),
                            "originalTransactionId": String(tx.originalID),
                            "jwsRepresentation": result.jwsRepresentation
                        ])
                    }
                }
                call.resolve(["transactions": transactions])
            } catch {
                call.reject("Failed to restore: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - manageSubscriptions()

    @objc func manageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene else {
                call.reject("No active scene available")
                return
            }
            do {
                try await AppStore.showManageSubscriptions(in: scene)
                call.resolve()
            } catch {
                call.reject("Failed to open subscription management: \(error.localizedDescription)")
            }
        }
    }
}
