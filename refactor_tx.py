import re
import os

filepath = r"d:\Projects\wake_up_makeup_development\src\quick-e-commerce\quick-delivery-order.service.ts"
with open(filepath, 'r') as f:
    content = f.read()

# 1. We need to remove the global `paymentTransactionModel.create` block for WALLET
# Lines 197-205
wallet_tx_pattern = r"await this\.paymentTransactionModel\.create\(\[\{\s*customerId: new Types\.ObjectId\(userId\),\s*referenceType: ReferenceType\.QUICK_ORDER,\s*referenceId: createdOrder\._id,\s*paymentMode: PaymentMode\.ONLINE,\s*paymentMethod: TransactionPaymentMethod\.WALLET,\s*amount: walletAmountUsed,\s*status: TransactionStatus\.SUCCESS\s*\}\], \{ session \}\);"
content = re.sub(wallet_tx_pattern, "", content)

# 2. We need to remove the global `paymentTransactionModel.create` block for COD
# Lines 210-218
cod_tx_pattern = r"if \(remainingAmount > 0 && \(dto\.paymentMethod === PaymentMethod\.CASH_ON_DELIVERY \|\| dto\.paymentMethod === PaymentMethod\.WALLET_PLUS_COD\)\) \{\s*await this\.paymentTransactionModel\.create\(\[\{\s*customerId: new Types\.ObjectId\(userId\),\s*referenceType: ReferenceType\.QUICK_ORDER,\s*referenceId: createdOrder\._id,\s*paymentMode: PaymentMode\.COD,\s*paymentMethod: TransactionPaymentMethod\.CASH,\s*amount: remainingAmount,\s*status: TransactionStatus\.PENDING\s*\}\], \{ session \}\);\s*\}"
content = re.sub(cod_tx_pattern, "", content)

# 3. Add `let currentWalletRemaining = walletAmountUsed;` before the vendor loop
# We can find `const vendorOwnerIds = new Set<string>();` and insert after it.
loop_start = "const vendorOwnerIds = new Set<string>();\n"
content = content.replace(loop_start, loop_start + "            let currentWalletRemaining = walletAmountUsed;\n")

# 4. In the loop, after `const savedVendorOrder = await vendorOrder.save({ session });`, insert the new transaction logic.
saved_vendor_order = "const savedVendorOrder = await vendorOrder.save({ session });\n"
new_tx_logic = """
                let vendorWalletPaid = 0;
                let vendorCodPaid = 0;

                if (currentWalletRemaining >= vendorTotal) {
                    vendorWalletPaid = vendorTotal;
                    currentWalletRemaining -= vendorTotal;
                } else if (currentWalletRemaining > 0) {
                    vendorWalletPaid = currentWalletRemaining;
                    vendorCodPaid = vendorTotal - currentWalletRemaining;
                    currentWalletRemaining = 0;
                } else {
                    vendorCodPaid = vendorTotal;
                }

                if (vendorWalletPaid > 0) {
                    await this.paymentTransactionModel.create([{
                        customerId: new Types.ObjectId(userId),
                        referenceType: ReferenceType.QUICK_ORDER,
                        referenceId: savedVendorOrder._id,
                        paymentMode: PaymentMode.ONLINE,
                        paymentMethod: TransactionPaymentMethod.WALLET,
                        amount: parseFloat(vendorWalletPaid.toFixed(2)),
                        status: TransactionStatus.SUCCESS
                    }], { session });
                }

                if (vendorCodPaid > 0 && (dto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY || dto.paymentMethod === PaymentMethod.WALLET_PLUS_COD)) {
                    await this.paymentTransactionModel.create([{
                        customerId: new Types.ObjectId(userId),
                        referenceType: ReferenceType.QUICK_ORDER,
                        referenceId: savedVendorOrder._id,
                        paymentMode: PaymentMode.COD,
                        paymentMethod: TransactionPaymentMethod.CASH,
                        amount: parseFloat(vendorCodPaid.toFixed(2)),
                        status: TransactionStatus.PENDING
                    }], { session });
                }
"""

content = content.replace(saved_vendor_order, saved_vendor_order + new_tx_logic)

with open(filepath, 'w') as f:
    f.write(content)
