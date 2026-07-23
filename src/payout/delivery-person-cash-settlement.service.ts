import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CashSettlement, CashSettlementDocument, CashSettlementStatus, CollectedBy } from './schema/cash-settlement.schema';
import { PaymentTransaction, PaymentTransactionDocument, PaymentMode } from './schema/payment-transaction.schema';
import { VendorQuickOrder, VendorOrderDocument, VendorOrderStatus } from 'src/quick-e-commerce/schema/quick-vendor-order.schema';
import { DeliveryPerson, DeliveryPersonDocument } from 'src/quick-e-commerce/schema/delivery-person.schema';
import { ApiResponse } from 'src/common/responses/api-response';

@Injectable()
export class DeliveryPersonCashSettlementService {
    constructor(
        @InjectModel(CashSettlement.name) private cashSettlementModel: Model<CashSettlementDocument>,
        @InjectModel(PaymentTransaction.name) private paymentTransactionModel: Model<PaymentTransactionDocument>,
        @InjectModel(VendorQuickOrder.name) private vendorOrderModel: Model<VendorOrderDocument>,
        @InjectModel(DeliveryPerson.name) private deliveryPersonModel: Model<DeliveryPersonDocument>,
    ) { }

    async generateCashSettlement(userId: string, transactionId: string, amount?: number, remarks?: string) {
        // 1. Verify delivery person
        const deliveryPerson = await this.deliveryPersonModel.findOne({ userId: new Types.ObjectId(userId) });
        if (!deliveryPerson) {
            throw new NotFoundException('Delivery person profile not found');
        }

        console.log("TransactionId in line 26", transactionId)

        // 2. Find the payment transaction
        const paymentTx = await this.paymentTransactionModel.findOne({
            _id: new Types.ObjectId(transactionId),
            paymentMode: PaymentMode.COD
        });

        if (!paymentTx) {
            throw new NotFoundException('No COD payment transaction found for this ID');
        }

        console.log("PaymentTx in line 36", paymentTx.referenceId, deliveryPerson)

        // 3. Verify vendor order
        const vendorOrder = await this.vendorOrderModel.findOne({
            _id: new Types.ObjectId(paymentTx.referenceId as any),
            deliveryPersonId: new Types.ObjectId(deliveryPerson._id as any)
        });
        if (!vendorOrder) {
            throw new NotFoundException('Assigned order not found for this transaction');
        }
        if (vendorOrder.status !== VendorOrderStatus.DELIVERED) {
            throw new BadRequestException('Order must be delivered before generating cash settlement');
        }

        // 4. Check if settlement already exists
        const existing = await this.cashSettlementModel.findOne({ paymentTransactionId: paymentTx._id });
        if (existing && existing.status !== CashSettlementStatus.REJECTED && existing.status !== CashSettlementStatus.CANCELLED) {
            throw new BadRequestException('Cash settlement already exists for this transaction');
        }

        // 5. Create cash settlement
        const settlementAmount = amount !== undefined ? amount : paymentTx.amount;

        const settlement = await this.cashSettlementModel.create({
            paymentTransactionId: new Types.ObjectId(paymentTx._id as any),
            referenceType: paymentTx.referenceType,
            referenceId: new Types.ObjectId(paymentTx.referenceId as any),
            amount: paymentTx.amount,
            collectedBy: CollectedBy.DELIVERY_PERSON,
            collectedByReferenceId: new Types.ObjectId(deliveryPerson._id as any),
            depositedAmount: settlementAmount,
            status: CashSettlementStatus.DEPOSITED,
            depositedAt: new Date(),
            remarks: remarks || `Deposited cash for order ${vendorOrder._id}`
        });

        return ApiResponse.success('Cash settlement generated successfully', settlement);
    }
}
