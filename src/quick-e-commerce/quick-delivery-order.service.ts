import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel, InjectConnection } from "@nestjs/mongoose";
import { Model, Types, Connection } from "mongoose";
import { QuickOrder, QuickOrderDocument, QuickOrderStatus, PaymentStatus, OrderItemStatus, PaymentMethod } from "./schema/quick-order.schema";
import { VendorQuickOrder, VendorOrderDocument, VendorOrderStatus } from "./schema/quick-vendor-order.schema";
import { QuickDeliveryCart, QuickDeliveryCartDocument } from "./schema/quick-delivery-cart";
import { Address, AddressDocument } from "src/address/schema/address.schema";
import { ProductVariant, ProductVariantDocument } from "src/product/schema/product-variant.schema";
import { Coupon, CouponDocument } from "src/coupon/schema/coupon.schema";
import { UserWallet, UserWalletDocument } from "src/wallet/schema/user/user.wallet.schema";
import { WalletTransaction, WalletTransactionDocument, WalletTransactionType, WalletTransactionReason } from "src/wallet/schema/user/user.wallet.transactions";
import { QuickDeliveryCheckoutService } from "./quick-delivery-checkout.service";
import { PlaceQuickOrderDto } from "./dto/quick-order.dto";
import { UpdateVendorOrderStatusDto } from "./dto/vendor-order-update.dto";
import { Vendor, VendorDocument } from "src/vendor/schema/vendor.schema";
import { DeliveryPerson, DeliveryPersonDocument, DeliveryPersonReference, DeliveryPersonStatus } from "./schema/delivery-person.schema";
import { CommissionRate, CommissionRateDocument, CommissionEntityType } from "src/admin/schema/commission-rate.schema";
import { Notification, NotificationDocument, NotificationModuleType, NotificationType, NotificationPriority } from "src/notification/schema/notification.schema";
import { NotificationService } from "src/notification/notification.service";
import { DocumentService } from "src/document/document.service";
import { DeliveryPersonAssignment, DeliveryPersonAssignmentDocument } from "./schema/delivery-person-assignment.schema";
import { QuickDeliveryConfiguration, QuickDeliveryConfigurationDocument } from "./schema/quickDeliveryConfig";
import { PaymentMode, PaymentTransaction, PaymentTransactionDocument, ReferenceType, TransactionStatus } from 'src/payout/schema/payment-transaction.schema';
import { PaymentMethod as TransactionPaymentMethod } from 'src/payout/schema/payment-transaction.schema';
import { MarketplaceEarning, MarketplaceEarningDocument, EarningRole, EarningReferenceType, EarningStatus } from 'src/payout/schema/market-place-earning.schema';
import { Influencer, InfluencerDocument } from 'src/influencer/schema/influencer.schema';
import { VendorOrder as StandardVendorOrder, VendorOrderDocument as StandardVendorOrderDocument } from 'src/order/schema/vendor-order.schema';

@Injectable()
export class QuickOrderService {
    constructor(
        @InjectModel(QuickOrder.name) private quickOrderModel: Model<QuickOrderDocument>,
        @InjectModel(VendorQuickOrder.name) private vendorOrderModel: Model<VendorOrderDocument>,
        @InjectModel(QuickDeliveryCart.name) private cartModel: Model<QuickDeliveryCartDocument>,
        @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
        @InjectModel(ProductVariant.name) private variantModel: Model<ProductVariantDocument>,
        @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
        @InjectModel(UserWallet.name) private walletModel: Model<UserWalletDocument>,
        @InjectModel(WalletTransaction.name) private walletTxModel: Model<WalletTransactionDocument>,
        @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
        @InjectModel(DeliveryPerson.name) private deliveryPersonModel: Model<DeliveryPersonDocument>,
        @InjectModel(CommissionRate.name) private commissionRateModel: Model<CommissionRateDocument>,
        @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
        @InjectModel(DeliveryPersonAssignment.name) private deliveryPersonAssignmentModel: Model<DeliveryPersonAssignmentDocument>,
        @InjectModel(QuickDeliveryConfiguration.name) private quickDeliveryConfigModel: Model<QuickDeliveryConfigurationDocument>,
        @InjectModel(PaymentTransaction.name) private paymentTransactionModel: Model<PaymentTransactionDocument>,
        @InjectModel(MarketplaceEarning.name) private marketplaceEarningModel: Model<MarketplaceEarningDocument>,
        @InjectModel(Influencer.name) private influencerModel: Model<InfluencerDocument>,
        @InjectModel(StandardVendorOrder.name) private standardVendorOrderModel: Model<StandardVendorOrderDocument>,
        @InjectConnection() private connection: Connection,
        private checkoutService: QuickDeliveryCheckoutService,
        private notificationService: NotificationService,
        private documentService: DocumentService
    ) { }

    async placeOrder(userId: string, dto: PlaceQuickOrderDto) {
        // 1. Get checkout details to reuse calculation logic
        const checkoutRes = await this.checkoutService.getCheckoutDetails(userId, dto.couponCode);
        const checkoutDetails = checkoutRes.data;

        if (!checkoutDetails.groupedItems || checkoutDetails.groupedItems.length === 0) {
            throw new BadRequestException('Cart is empty');
        }

        // 2. Fetch User Address
        const address = await this.addressModel.findOne({
            _id: new Types.ObjectId(dto.addressId),
            user: new Types.ObjectId(userId),
            isActive: true,
            isDeleted: false
        });

        if (!address) {
            throw new NotFoundException('Delivery address not found or is invalid');
        }

        // Note: Coordinates check removed - manual addresses may not have GPS coordinates

        // 3. Vendor validation - check vendor exists and is accepting orders
        const fullVendorsMap = new Map();
        for (const group of checkoutDetails.groupedItems) {
            const vendor = group.vendor;
            if (vendor) {
                const fullVendor = await this.vendorModel.findById(vendor._id);
                if (!fullVendor) {
                    throw new BadRequestException(`Vendor ${vendor.businessName} not found`);
                }
                if (!fullVendor.isActive || fullVendor['isDeleted']) {
                    throw new BadRequestException(`Vendor ${vendor.businessName} is currently unavailable`);
                }
                if (!fullVendor['quickCommerce']?.acceptingOrders) {
                    throw new BadRequestException(`Vendor ${vendor.businessName} is not accepting quick orders at this time`);
                }
                fullVendorsMap.set(vendor._id.toString(), fullVendor);
            }
        }

        const session = await this.connection.startSession();
        session.startTransaction();

        try {
            // 4. Stock Check & Deduction
            const cartItems = checkoutDetails.items || [];
            const fullVariantsMap = new Map();
            for (const item of cartItems) {
                const variantId = item.variant?._id;
                if (!variantId) continue;

                const variant = await this.variantModel.findById(variantId).session(session);
                if (!variant || variant.stock < item.quantity) {
                    throw new BadRequestException(`Insufficient stock for product ${item.product?.name}`);
                }
                // Deduct stock
                variant.stock -= item.quantity;
                await variant.save({ session });

                fullVariantsMap.set(variantId.toString(), variant);
            }

            // 5. Update Coupon Usage if applied
            if (checkoutDetails.appliedCoupon) {
                const couponId = checkoutDetails.appliedCoupon._id;
                await this.couponModel.findByIdAndUpdate(couponId, { $inc: { totalUsed: 1 } }, { session });
            }

            // Wallet Check
            let paymentStatus = PaymentStatus.PENDING;
            let walletAmountUsed = 0;
            if (dto.paymentMethod === PaymentMethod.WALLET || dto.paymentMethod === PaymentMethod.WALLET_PLUS_COD) {
                const wallet = await this.walletModel.findOne({ userId: new Types.ObjectId(userId) }).session(session);

                if (dto.paymentMethod === PaymentMethod.WALLET) {
                    if (!wallet || wallet.balance < checkoutDetails.finalAmount) {
                        throw new BadRequestException('Insufficient wallet balance');
                    }
                    walletAmountUsed = checkoutDetails.finalAmount;
                } else if (dto.paymentMethod === PaymentMethod.WALLET_PLUS_COD) {
                    const advanceAmount = parseFloat((checkoutDetails.finalAmount * 0.2).toFixed(2));
                    if (!wallet || wallet.balance < advanceAmount) {
                        throw new BadRequestException(`Minimum ₹${advanceAmount} wallet balance required as advance payment`);
                    }
                    walletAmountUsed = advanceAmount;
                }

                if (walletAmountUsed > 0 && wallet) {
                    wallet.balance -= walletAmountUsed;
                    wallet.totalDebits += walletAmountUsed;
                    await wallet.save({ session });
                }

                if (dto.paymentMethod === PaymentMethod.WALLET) {
                    paymentStatus = PaymentStatus.PAID;
                }
            }

            // 6. Create main QuickOrder
            const newOrder = new this.quickOrderModel({
                customerId: new Types.ObjectId(userId),
                addressId: new Types.ObjectId(dto.addressId),
                shippingAddress: {
                    fullName: 'User', // Would normally come from user profile, setting a default
                    phone: address.phone1,
                    line1: address.line1,
                    line2: address.line2,
                    city: address.city,
                    state: address.state,
                    pincode: address.pincode,
                    country: 'India'
                },
                location: address.location,
                paymentMethod: dto.paymentMethod,
                paymentStatus: paymentStatus,
                vendorOrders: [],
                subtotal: checkoutDetails.subtotal,
                deliveryCharge: checkoutDetails.deliveryCharge,
                tax: checkoutDetails.tax || 0,
                packagingCharge: checkoutDetails.packagingCharge || 0,
                discount: checkoutDetails.couponDiscount,
                grandTotal: checkoutDetails.finalAmount,
                status: QuickOrderStatus.PROCESSING,
                items: []
            });

            const createdOrder = await newOrder.save({ session });
            if (walletAmountUsed > 0) {
                const wallet = await this.walletModel.findOne({ userId: new Types.ObjectId(userId) }).session(session);
                if (wallet) {
                    const walletTx = new this.walletTxModel({
                        walletId: wallet._id,
                        userId: new Types.ObjectId(userId),
                        amount: walletAmountUsed,
                        type: WalletTransactionType.DEBIT,
                        reason: WalletTransactionReason.ORDER_PAYMENT,
                        orderId: createdOrder._id,
                        description: `Payment for Quick Order ${createdOrder._id}`,
                        balanceAfterTransaction: wallet.balance
                    });
                    await walletTx.save({ session });

                }
            }
            const remainingAmount = parseFloat((checkoutDetails.finalAmount - walletAmountUsed).toFixed(2));

            const commissionDoc = await this.commissionRateModel.findOne().session(session);
            const quickDeliverySlab = commissionDoc?.commissions?.find(s => s.entityType === CommissionEntityType.QUICK_DELIVERY);
            const vendorSlab = commissionDoc?.commissions?.find(s => s.entityType === CommissionEntityType.VENDOR);
            const platformCommissionRate = quickDeliverySlab?.commissionPercentage ?? vendorSlab?.commissionPercentage ?? 25;
            const orderItemsList: any[] = [];
            const vendorOrderIds: Types.ObjectId[] = [];
            const vendorOwnerIds = new Set<string>();
            let currentWalletRemaining = walletAmountUsed;
            for (const group of checkoutDetails.groupedItems) {
                const vendor = group.vendor;
                const fullVendor = fullVendorsMap.get(vendor._id.toString());
                const groupItems = group.items;
                if (fullVendor && fullVendor.ownerId) {
                    vendorOwnerIds.add(fullVendor.ownerId.toString());
                }
                let vendorSubtotal = 0;
                const vendorOrderItems: any[] = [];
                for (const item of groupItems) {
                    const variant = item.variant;
                    const product = item.product;
                    const fullVariant = fullVariantsMap.get(variant?._id?.toString());
                    const salesPrice = variant.salesPrice || 0;
                    const offeredPrice = variant.offeredPrice || 0;
                    const finalPrice = offeredPrice > 0 && salesPrice > offeredPrice ? offeredPrice : salesPrice;
                    vendorSubtotal += (finalPrice * item.quantity);
                    const itemTotalPrice = finalPrice * item.quantity;
                    let itemCouponDiscount = 0;
                    if (checkoutDetails.appliedCoupon && checkoutDetails.couponDiscount > 0 && checkoutDetails.subtotal > 0) {
                        itemCouponDiscount = (itemTotalPrice / checkoutDetails.subtotal) * checkoutDetails.couponDiscount;
                    }
                    const orderItem = {
                        productId: new Types.ObjectId(product._id),
                        variantId: new Types.ObjectId(variant._id),
                        vendorId: new Types.ObjectId(vendor._id),
                        productName: product.name,
                        productImage: product.thumbnail || (Array.isArray(product.images) ? product.images[0] : null),
                        sku: fullVariant?.sku || 'N/A',
                        attributes: variant.attributes || {},
                        quantity: item.quantity,
                        costPrice: fullVariant?.costPrice || 0,
                        salesPrice: salesPrice,
                        offeredPrice: offeredPrice,
                        totalPrice: salesPrice * item.quantity,
                        discountAmount: (salesPrice > offeredPrice && offeredPrice > 0) ? (salesPrice - offeredPrice) * item.quantity : 0,
                        finalPrice: itemTotalPrice,
                        status: OrderItemStatus.PENDING,
                        couponId: checkoutDetails.appliedCoupon ? new Types.ObjectId(checkoutDetails.appliedCoupon._id) : undefined,
                        couponCode: checkoutDetails.appliedCoupon?.code,
                        appliedCouponDiscountAmount: itemCouponDiscount
                    };
                    vendorOrderItems.push(orderItem);
                    orderItemsList.push(orderItem);
                }
                let vendorDiscountAmount = 0;
                let vendorPackingCharge = 0;
                let vendorTax = 0;
                let vendorDeliveryCharge = 0;
                if (checkoutDetails.subtotal > 0) {
                    const ratio = vendorSubtotal / checkoutDetails.subtotal;
                    vendorDiscountAmount = ratio * checkoutDetails.couponDiscount;
                    vendorPackingCharge = ratio * (checkoutDetails.packagingCharge || 0);
                    vendorTax = ratio * (checkoutDetails.tax || 0);
                    vendorDeliveryCharge = ratio * (checkoutDetails.deliveryCharge || 0);
                }
                const vendorTotal = vendorSubtotal + vendorPackingCharge + vendorTax + vendorDeliveryCharge - vendorDiscountAmount;
                const vendorCommissionAmount = ((vendorSubtotal - vendorDiscountAmount) * platformCommissionRate) / 100;
                const vendorOrder = new this.vendorOrderModel({
                    quickOrderId: createdOrder._id,
                    vendorId: new Types.ObjectId(vendor._id),
                    items: vendorOrderItems,
                    paymentStatus: paymentStatus,
                    subtotal: vendorSubtotal,
                    packingCharge: vendorPackingCharge,
                    deliveryCharge: vendorDeliveryCharge,
                    tax: vendorTax,
                    total: vendorTotal,
                    discountAmount: vendorDiscountAmount,
                    couponId: checkoutDetails.appliedCoupon ? new Types.ObjectId(checkoutDetails.appliedCoupon._id) : undefined,
                    couponCode: checkoutDetails.appliedCoupon?.code,
                    appliedCouponDiscountAmount: vendorDiscountAmount,
                    commissionAmount: vendorCommissionAmount,
                    commissionRate: platformCommissionRate,
                    estimatedPreparationMinutes: fullVendor?.quickCommerce?.defaultPreparationTime || 10,
                    location: address.location,
                    status: VendorOrderStatus.PREPARING,
                    acceptedAt: new Date()
                });
                const savedVendorOrder = await vendorOrder.save({ session });

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
                vendorOrderIds.push(savedVendorOrder._id);
            }
            createdOrder.items = orderItemsList;
            createdOrder.vendorOrders = vendorOrderIds;
            await createdOrder.save({ session });
            await this.cartModel.updateOne({ user: new Types.ObjectId(userId) }, { $set: { items: [] } }, { session });
            await new this.notificationModel({
                receiverId: userId as any,
                type: NotificationType.TRANSACTIONAL,
                priority: NotificationPriority.HIGH,
                title: 'Order Placed Successfully',
                body: `Your quick delivery order #${createdOrder._id.toString().substring(0, 8)} has been placed successfully.`,
                moduleType: NotificationModuleType.ORDER
            }).save({ session });
            for (const ownerId of vendorOwnerIds) {
                await new this.notificationModel({
                    receiverId: ownerId as any,
                    type: NotificationType.TRANSACTIONAL,
                    priority: NotificationPriority.HIGH,
                    title: 'New Quick Order Received',
                    body: `You have received a new quick delivery order. Please prepare the items.`,
                    moduleType: NotificationModuleType.ORDER
                }).save({ session });
                await this.notificationService.sendNotification({
                    receiverId: ownerId,
                    type: NotificationType.TRANSACTIONAL,
                    priority: NotificationPriority.HIGH,
                    title: 'New Quick Order Received',
                    body: `You have received a new quick delivery order. Please prepare the items.`,
                    moduleType: NotificationModuleType.ORDER
                });
            }
            await this.notificationService.sendNotification({
                receiverId: userId,
                type: NotificationType.TRANSACTIONAL,
                priority: NotificationPriority.HIGH,
                title: 'Order Placed Successfully',
                body: `Your quick delivery order #${createdOrder._id.toString().substring(0, 8)} has been placed successfully.`,
                moduleType: NotificationModuleType.ORDER
            });
            await session.commitTransaction();
            session.endSession();
            return {
                message: 'Order placed successfully',
                orderId: createdOrder._id,
                status: createdOrder.status,
                grandTotal: createdOrder.grandTotal
            };
        }
        catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }
    async getUserOrders(userId, page, limit, status) {
        const skip = (page - 1) * limit;
        const query: any = { customerId: new Types.ObjectId(userId) };
        if (status) {
            query.status = status;
        }
        const [orders, total] = await Promise.all([
            this.quickOrderModel.find(query)
                .populate({
                    path: 'items.variantId',
                    select: 'thumbnail images sku',
                    populate: [
                        { path: 'thumbnail', select: 'url publicId' },
                        { path: 'images', select: 'url publicId' }
                    ]
                })
                .populate({
                    path: 'items.productId',
                    select: 'name variants',
                    populate: {
                        path: 'variants',
                        select: 'thumbnail images',
                        populate: [
                            { path: 'thumbnail', select: 'url publicId' },
                            { path: 'images', select: 'url publicId' }
                        ]
                    }
                })
                .populate({
                    path: 'vendorOrders',
                    populate: { path: 'deliveryPersonId', select: 'name phone vehicleType vehicleNumber status' }
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.quickOrderModel.countDocuments(query)
        ]);
        return {
            orders,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }
    async cancelOrder(userId, orderId, reason) {
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const mainOrder = await this.quickOrderModel.findOne({ _id: new Types.ObjectId(orderId), customerId: new Types.ObjectId(userId) }).session(session);
            if (!mainOrder)
                throw new NotFoundException('Order not found');
            if (mainOrder.status === QuickOrderStatus.DELIVERED) {
                throw new BadRequestException('Cannot cancel a delivered order');
            }
            if (mainOrder.status === QuickOrderStatus.CANCELLED) {
                throw new BadRequestException('Order is already cancelled');
            }
            mainOrder.status = QuickOrderStatus.CANCELLED;
            mainOrder.items.forEach(item => {
                if (item.status !== OrderItemStatus.DELIVERED && item.status !== OrderItemStatus.RETURNED) {
                    item.status = OrderItemStatus.CANCELLED;
                    item.cancelledAt = new Date();
                    item.cancellationReason = reason || 'Cancelled by User';
                }
            });
            mainOrder.markModified('items');
            await mainOrder.save({ session });
            const vendorOrdersToCancel = await this.vendorOrderModel.find({ _id: { $in: mainOrder.vendorOrders }, status: { $ne: VendorOrderStatus.DELIVERED } }).session(session);
            for (const vo of vendorOrdersToCancel) {
                vo.status = VendorOrderStatus.CANCELLED;
                vo.cancelledAt = new Date();
                vo.cancelledReason = reason || 'Cancelled by User';
                vo.items.forEach(item => {
                    if (item.status !== OrderItemStatus.DELIVERED && item.status !== OrderItemStatus.RETURNED) {
                        item.status = OrderItemStatus.CANCELLED;
                        item.cancelledAt = new Date();
                        item.cancellationReason = reason || 'Cancelled by User';
                    }
                });
                vo.markModified('items');
                await vo.save({ session });
                if (vo.deliveryPersonId) {
                    const deliveryPerson = await this.deliveryPersonModel.findById(new Types.ObjectId(vo.deliveryPersonId)).session(session);
                    if (deliveryPerson) {
                        deliveryPerson.status = DeliveryPersonStatus.AVAILABLE;
                        await deliveryPerson.save({ session });
                    }
                }
            }
            if (mainOrder.paymentStatus === PaymentStatus.PAID) {
                const refundAmount = mainOrder.grandTotal;
                const wallet = await this.walletModel.findOne({ userId: mainOrder.customerId }).session(session);
                if (wallet) {
                    wallet.balance += refundAmount;
                    wallet.totalCredits += refundAmount;
                    await wallet.save({ session });
                    const walletTx = new this.walletTxModel({
                        walletId: wallet._id,
                        userId: mainOrder.customerId,
                        amount: refundAmount,
                        type: WalletTransactionType.CREDIT,
                        reason: WalletTransactionReason.REFUND,
                        orderId: mainOrder._id,
                        description: `Refund for Cancelled Order ${mainOrder._id} by User`,
                        balanceAfterTransaction: wallet.balance
                    });
                    await walletTx.save({ session });
                    await this.paymentTransactionModel.create([{
                        customerId: mainOrder.customerId,
                        referenceType: ReferenceType.QUICK_ORDER,
                        referenceId: mainOrder._id,
                        paymentMode: PaymentMode.ONLINE,
                        paymentMethod: TransactionPaymentMethod.WALLET,
                        amount: refundAmount,
                        status: TransactionStatus.REFUNDED
                    }], { session });
                }
                mainOrder.paymentStatus = PaymentStatus.REFUNDED;
            }
            await session.commitTransaction();
            session.endSession();
            return { message: 'Order cancelled successfully', refundAmount: mainOrder.grandTotal };
        }
        catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }
    async getVendorOrders(vendorIdOrUserId, page, limit, status, deliveryPersonId) {
        let vId = vendorIdOrUserId;
        let targetVendorIds: any[] = [];

        if (vId) {
            const vendors = await this.vendorModel.find({
                $or: [
                    { _id: Types.ObjectId.isValid(vId) ? new Types.ObjectId(vId) : null },
                    { ownerId: Types.ObjectId.isValid(vId) ? new Types.ObjectId(vId) : null },
                    { ownerId: String(vId) as any }
                ]
            });
            if (vendors.length > 0) {
                targetVendorIds = vendors.map(v => v._id);
            } else if (Types.ObjectId.isValid(vId)) {
                targetVendorIds = [new Types.ObjectId(vId)];
            }
        }

        const skip = (page - 1) * limit;
        const query: any = {};
        if (targetVendorIds.length > 0) {
            query.vendorId = { $in: targetVendorIds };
        }
        if (status && status !== 'ALL' && status.trim() !== '') {
            query.status = status;
        }
        if (deliveryPersonId)
            query.deliveryPersonId = new Types.ObjectId(deliveryPersonId);
        const [orders, total] = await Promise.all([
            this.vendorOrderModel.find(query)
                .populate({
                    path: 'items.variantId',
                    select: 'thumbnail images sku',
                    populate: [
                        { path: 'thumbnail', select: 'url publicId' },
                        { path: 'images', select: 'url publicId' }
                    ]
                })
                .populate({
                    path: 'items.productId',
                    select: 'name variants',
                    populate: {
                        path: 'variants',
                        select: 'thumbnail images',
                        populate: [
                            { path: 'thumbnail', select: 'url publicId' },
                            { path: 'images', select: 'url publicId' }
                        ]
                    }
                })
                .populate('deliveryPersonId')
                .populate({
                    path: 'quickOrderId',
                    select: 'customerId addressId shippingAddress paymentMethod paymentStatus grandTotal createdAt',
                    populate: [
                        { path: 'customerId', select: 'name email phone' },
                        { path: 'addressId' }
                    ]
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.vendorOrderModel.countDocuments(query)
        ]);
        return {
            success: true,
            message: 'Vendor orders fetched successfully',
            data: {
                orders,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async assignDeliveryPerson(vendorId, orderId, deliveryPersonId) {
        let vendorOrder = await this.vendorOrderModel.findById(orderId);
        if (!vendorOrder)
            throw new NotFoundException('Vendor order not found');
        const deliveryPerson = await this.deliveryPersonModel.findOne({ _id: new Types.ObjectId(deliveryPersonId), isDeleted: false, isActive: true });
        if (!deliveryPerson)
            throw new BadRequestException('Delivery person not found or inactive');

        if (!deliveryPerson.assignedVendorIds.some(id => id.toString() === String(vendorId))) {
            deliveryPerson.assignedVendorIds.push(new Types.ObjectId(vendorId));
        }
        vendorOrder.deliveryPersonId = new Types.ObjectId(deliveryPersonId);
        vendorOrder.readyAt = new Date();
        vendorOrder.status = VendorOrderStatus.OUT_FOR_DELIVERY;
        await vendorOrder.save();
        deliveryPerson.status = DeliveryPersonStatus.ON_DELIVERY;
        await deliveryPerson.save();
        if (deliveryPerson.userId) {
            await this.notificationService.sendNotification({
                receiverId: deliveryPerson.userId.toString(),
                type: NotificationType.TRANSACTIONAL,
                priority: NotificationPriority.HIGH,
                title: 'New Order Assigned',
                body: `You have been assigned a new delivery for order #${vendorOrder._id.toString().substring(0, 8)}.`,
                moduleType: NotificationModuleType.ORDER
            });
            await new this.notificationModel({
                receiverId: deliveryPerson.userId,
                type: NotificationType.TRANSACTIONAL,
                priority: NotificationPriority.HIGH,
                title: 'New Order Assigned',
                body: `You have been assigned a new delivery for order #${vendorOrder._id.toString().substring(0, 8)}.`,
                moduleType: NotificationModuleType.ORDER
            }).save();
        }
        return { message: 'Delivery person assigned successfully', order: vendorOrder };
    }
    async updateVendorOrder(vendorId, orderId, dto, files) {
        if (dto.status === VendorOrderStatus.DELIVERED) {
            return this.markVendorOrderAsDelivered(orderId, files || [], vendorId, 'VENDOR');
        }
        if (dto.status === VendorOrderStatus.CANCELLED) {
            return this.cancelVendorOrder(vendorId, orderId, dto.cancelledReason);
        }
        const vendorOrder = await this.vendorOrderModel.findOne({ _id: new Types.ObjectId(orderId), vendorId: new Types.ObjectId(vendorId) });
        if (!vendorOrder)
            throw new NotFoundException('Vendor order not found');
        if (dto.status)
            vendorOrder.status = dto.status;
        if (dto.estimatedDeliveryMinutes !== undefined)
            vendorOrder.estimatedDeliveryMinutes = dto.estimatedDeliveryMinutes;
        if (dto.estimatedPreparationMinutes !== undefined)
            vendorOrder.estimatedPreparationMinutes = dto.estimatedPreparationMinutes;
        await vendorOrder.save();
        return vendorOrder;
    }
    async markVendorOrderAsDelivered(vendorOrderId: string, files, userId: string, role) {
        const toObjectId = (val: any): Types.ObjectId | null => {
            if (!val) return null;
            const str = typeof val === 'object' && val !== null ? (val._id ? String(val._id) : String(val)) : String(val);
            return Types.ObjectId.isValid(str) ? new Types.ObjectId(str) : null;
        };

        let uploadedProofIds: string[] = [];
        if (files && files.length > 0) {
            try {
                const uploadRes = await this.documentService.uploadMultiplFiles(files, 'delivery-proofs', userId);
                if (uploadRes && uploadRes.data && Array.isArray(uploadRes.data)) {
                    uploadedProofIds = uploadRes.data.map((m: any) => m._id ? String(m._id) : String(m));
                }
            } catch (uErr) {
                console.error("Delivery proof photo upload notice:", uErr);
            }
        }

        let session: any = null;
        try {
            session = await this.connection.startSession();
            session.startTransaction();
        } catch (sessErr: any) {
            console.warn("MongoDB Transactions notice (proceeding standalone):", sessErr?.message);
            session = null;
        }

        try {
            const queryOpts = session ? { session } : {};
            const orderObjId = toObjectId(vendorOrderId);
            let vendorOrder: any = null;
            if (orderObjId) {
                vendorOrder = session ? await this.vendorOrderModel.findOne({ $or: [{ _id: orderObjId }, { quickOrderId: orderObjId }] }).session(session) : await this.vendorOrderModel.findOne({ $or: [{ _id: orderObjId }, { quickOrderId: orderObjId }] });
            }
            if (!vendorOrder) {
                vendorOrder = session ? await this.vendorOrderModel.findById(vendorOrderId).session(session) : await this.vendorOrderModel.findById(vendorOrderId);
            }
            if (!vendorOrder) {
                return { success: true, statusCode: 200, message: 'Order already completed or verified' };
            }

            vendorOrder.status = VendorOrderStatus.DELIVERED;
            vendorOrder.deliveredAt = new Date();
            if (vendorOrder.acceptedAt) {
                vendorOrder.estimatedDeliveryMinutes = Math.round((vendorOrder.deliveredAt.getTime() - vendorOrder.acceptedAt.getTime()) / 60000);
            }
            if (uploadedProofIds && uploadedProofIds.length > 0) {
                const validProofIds = uploadedProofIds.map(id => toObjectId(id)).filter(Boolean) as Types.ObjectId[];
                if (validProofIds.length > 0) {
                    vendorOrder.deliveryProofImages = validProofIds;
                }
            }
            vendorOrder.paymentStatus = PaymentStatus.PAID;
            if (vendorOrder.items && Array.isArray(vendorOrder.items)) {
                vendorOrder.items.forEach(item => {
                    item.status = OrderItemStatus.DELIVERED;
                });
                vendorOrder.markModified('items');
            }
            await vendorOrder.save(queryOpts);

            const vendorUser = session ? await this.vendorModel.findById(vendorOrder.vendorId).session(session) : await this.vendorModel.findById(vendorOrder.vendorId);
            const mainOrder = session ? await this.quickOrderModel.findById(vendorOrder.quickOrderId).session(session) : await this.quickOrderModel.findById(vendorOrder.quickOrderId);

            if (mainOrder && vendorUser) {
                const rawVendorUserId = (vendorUser as any)?.userId || (vendorUser as any)?.ownerId || (vendorUser as any)?._id;
                const vendorTargetUserId = toObjectId(rawVendorUserId);
                const safeCustomerId = toObjectId(mainOrder.customerId);
                const safeVendorOrderId = toObjectId(vendorOrder._id);

                let currentInfluencerUserId: Types.ObjectId | null = null;
                let calculatedInfluencerAmount = 0;
                let influencerRate = 0;

                if (mainOrder.appliedCoupon && mainOrder.appliedCoupon.influencerId && mainOrder.appliedCoupon.influencerCommissionRate) {
                    try {
                        const influencer = session ? await this.influencerModel.findById(mainOrder.appliedCoupon.influencerId).session(session) : await this.influencerModel.findById(mainOrder.appliedCoupon.influencerId);
                        if (influencer && influencer.userId) {
                            currentInfluencerUserId = toObjectId(influencer.userId);
                            influencerRate = mainOrder.appliedCoupon.influencerCommissionRate;
                            calculatedInfluencerAmount = parseFloat(((vendorOrder.total * influencerRate) / 100).toFixed(2));
                            const safeInfluencerId = toObjectId(influencer._id);
                            if (safeInfluencerId) {
                                vendorOrder.influencerId = safeInfluencerId;
                            }
                            vendorOrder.influencerCommissionRate = influencerRate;
                            vendorOrder.influencerCommissionAmount = calculatedInfluencerAmount;
                        }
                    } catch (iErr) {
                        console.error('Influencer resolution notice:', iErr);
                    }
                }

                let currentDeliveryPersonUserId: Types.ObjectId | null = null;
                let deliveryPersonAmount = 0;

                if (vendorOrder.deliveryPersonId) {
                    try {
                        const dpObjectId = toObjectId(vendorOrder.deliveryPersonId);
                        if (dpObjectId) {
                            const deliveryPerson = session ? await this.deliveryPersonModel.findById(dpObjectId).session(session) : await this.deliveryPersonModel.findById(dpObjectId);
                            if (deliveryPerson) {
                                deliveryPerson.status = DeliveryPersonStatus.AVAILABLE;
                                await deliveryPerson.save(queryOpts);
                                if (deliveryPerson.userId) {
                                    currentDeliveryPersonUserId = toObjectId(deliveryPerson.userId);
                                    const config = session ? await this.quickDeliveryConfigModel.findOne().session(session) : await this.quickDeliveryConfigModel.findOne();
                                    deliveryPersonAmount = config?.deliveryPersonChargeForPerDelivery || 0;
                                }
                            }
                        }
                    } catch (dpErr) {
                        console.error('Delivery person update notice:', dpErr);
                    }
                }

                try {
                    if (vendorTargetUserId && safeVendorOrderId && mainOrder.paymentMethod === PaymentMethod.WALLET) {
                        await this.marketplaceEarningModel.create([{
                            userId: vendorTargetUserId,
                            role: EarningRole.VENDOR,
                            referenceType: EarningReferenceType.QUICK_ORDER,
                            referenceId: safeVendorOrderId,
                            grossAmount: vendorOrder.total,
                            netAmount: vendorOrder.total - (vendorOrder.commissionAmount || 0),
                            platformCommission: vendorOrder.commissionAmount || 0,
                            tax: vendorOrder.tax || 0,
                            deduction: vendorOrder.commissionAmount || 0,
                            status: EarningStatus.PENDING
                        }], queryOpts);

                        if (currentInfluencerUserId && calculatedInfluencerAmount > 0) {
                            await this.marketplaceEarningModel.create([{
                                userId: currentInfluencerUserId,
                                role: EarningRole.INFLUENCER,
                                referenceType: EarningReferenceType.QUICK_ORDER,
                                referenceId: safeVendorOrderId,
                                grossAmount: calculatedInfluencerAmount,
                                netAmount: calculatedInfluencerAmount,
                                platformCommission: 0,
                                tax: 0,
                                deduction: 0,
                                status: EarningStatus.PENDING
                            }], queryOpts);
                        }
                        if (currentDeliveryPersonUserId && deliveryPersonAmount > 0) {
                            await this.marketplaceEarningModel.create([{
                                userId: currentDeliveryPersonUserId,
                                role: EarningRole.DELIVERY_PERSON,
                                referenceType: EarningReferenceType.QUICK_ORDER,
                                referenceId: safeVendorOrderId,
                                grossAmount: deliveryPersonAmount,
                                netAmount: deliveryPersonAmount,
                                platformCommission: 0,
                                tax: 0,
                                deduction: 0,
                                status: EarningStatus.PENDING
                            }], queryOpts);
                        }
                        if (safeCustomerId) {
                            await this.paymentTransactionModel.create([{
                                customerId: safeCustomerId,
                                referenceType: ReferenceType.QUICK_ORDER,
                                referenceId: safeVendorOrderId,
                                paymentMode: PaymentMode.ONLINE,
                                paymentMethod: TransactionPaymentMethod.WALLET,
                                amount: vendorOrder.total,
                                status: TransactionStatus.SUCCESS
                            }], queryOpts);
                        }
                    }
                    else if (safeCustomerId && safeVendorOrderId && mainOrder.paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
                        await this.paymentTransactionModel.create([{
                            customerId: safeCustomerId,
                            referenceType: ReferenceType.QUICK_ORDER,
                            referenceId: safeVendorOrderId,
                            paymentMode: PaymentMode.COD,
                            paymentMethod: TransactionPaymentMethod.CASH,
                            amount: vendorOrder.total,
                            status: TransactionStatus.PENDING
                        }], queryOpts);
                    }
                    else if (vendorTargetUserId && safeVendorOrderId && mainOrder.paymentMethod === PaymentMethod.WALLET_PLUS_COD) {
                        const advanceAmount = parseFloat((vendorOrder.total * 0.2).toFixed(2));
                        const codAmount = vendorOrder.total - advanceAmount;
                        await this.marketplaceEarningModel.create([{
                            userId: vendorTargetUserId,
                            role: EarningRole.VENDOR,
                            referenceType: EarningReferenceType.QUICK_ORDER,
                            referenceId: safeVendorOrderId,
                            grossAmount: advanceAmount,
                            netAmount: advanceAmount - ((vendorOrder.commissionAmount || 0) * 0.2),
                            platformCommission: (vendorOrder.commissionAmount || 0) * 0.2,
                            tax: (vendorOrder.tax || 0) * 0.2,
                            deduction: (vendorOrder.commissionAmount || 0) * 0.2,
                            status: EarningStatus.PENDING
                        }], queryOpts);
                        if (currentInfluencerUserId && calculatedInfluencerAmount > 0) {
                            const advanceInfluencerAmount = parseFloat((calculatedInfluencerAmount * 0.2).toFixed(2));
                            await this.marketplaceEarningModel.create([{
                                userId: currentInfluencerUserId,
                                role: EarningRole.INFLUENCER,
                                referenceType: EarningReferenceType.QUICK_ORDER,
                                referenceId: safeVendorOrderId,
                                grossAmount: advanceInfluencerAmount,
                                netAmount: advanceInfluencerAmount,
                                platformCommission: 0,
                                tax: 0,
                                deduction: 0,
                                status: EarningStatus.PENDING
                            }], queryOpts);
                        }
                        if (currentDeliveryPersonUserId && deliveryPersonAmount > 0) {
                            const advanceDeliveryAmount = parseFloat((deliveryPersonAmount * 0.2).toFixed(2));
                            await this.marketplaceEarningModel.create([{
                                userId: currentDeliveryPersonUserId,
                                role: EarningRole.DELIVERY_PERSON,
                                referenceType: EarningReferenceType.QUICK_ORDER,
                                referenceId: safeVendorOrderId,
                                grossAmount: advanceDeliveryAmount,
                                netAmount: advanceDeliveryAmount,
                                platformCommission: 0,
                                tax: 0,
                                deduction: 0,
                                status: EarningStatus.PENDING
                            }], queryOpts);
                        }
                        if (safeCustomerId) {
                            await this.paymentTransactionModel.create([{
                                customerId: safeCustomerId,
                                referenceType: ReferenceType.QUICK_ORDER,
                                referenceId: safeVendorOrderId,
                                paymentMode: PaymentMode.ONLINE,
                                paymentMethod: TransactionPaymentMethod.WALLET,
                                amount: advanceAmount,
                                status: TransactionStatus.SUCCESS
                            }], queryOpts);
                            await this.paymentTransactionModel.create([{
                                customerId: safeCustomerId,
                                referenceType: ReferenceType.QUICK_ORDER,
                                referenceId: safeVendorOrderId,
                                paymentMode: PaymentMode.COD,
                                paymentMethod: TransactionPaymentMethod.CASH,
                                amount: codAmount,
                                status: TransactionStatus.PENDING
                            }], queryOpts);
                        }
                    }
                } catch (earnErr) {
                    console.error('Marketplace earnings generation notice:', earnErr);
                }
            }

            if (mainOrder) {
                if (mainOrder.items && Array.isArray(mainOrder.items)) {
                    mainOrder.items.forEach(item => {
                        if (item.vendorId && String(item.vendorId) === String(vendorOrder.vendorId)) {
                            item.status = OrderItemStatus.DELIVERED;
                        }
                    });
                    mainOrder.markModified('items');
                }

                const allVendorOrders = session ? await this.vendorOrderModel.find({ quickOrderId: mainOrder._id }).session(session) : await this.vendorOrderModel.find({ quickOrderId: mainOrder._id });
                const allDelivered = allVendorOrders.every(vo => vo.status === VendorOrderStatus.DELIVERED);

                if (allDelivered) {
                    mainOrder.status = QuickOrderStatus.DELIVERED;
                    mainOrder.paymentStatus = PaymentStatus.PAID;

                    try {
                        const custIdStr = mainOrder.customerId?._id ? String(mainOrder.customerId._id) : String(mainOrder.customerId);
                        await this.notificationService.sendNotification({
                            receiverId: custIdStr,
                            type: NotificationType.TRANSACTIONAL,
                            priority: NotificationPriority.HIGH,
                            title: 'Order Delivered',
                            body: `Your quick delivery order #${mainOrder._id.toString().substring(0, 8)} has been delivered. Enjoy!`,
                            moduleType: NotificationModuleType.ORDER
                        });
                    } catch (nErr) {
                        console.error('Customer notification notice:', nErr);
                    }
                } else if (mainOrder.status !== QuickOrderStatus.PARTIALLY_CANCELLED && mainOrder.status !== QuickOrderStatus.CANCELLED) {
                    mainOrder.status = QuickOrderStatus.PARTIALLY_DELIVERED;
                }

                await mainOrder.save(queryOpts);
            }

            if (role === 'DELIVERY_PERSON') {
                if (vendorOrder.deliveryPersonId) {
                    try {
                        const config = session ? await this.quickDeliveryConfigModel.findOne().session(session) : await this.quickDeliveryConfigModel.findOne();
                        const deliveryCharge = config?.deliveryPersonChargeForPerDelivery || 0;

                        const assignment = new this.deliveryPersonAssignmentModel({
                            quickOrderId: vendorOrder.quickOrderId,
                            quickVendorOrderId: vendorOrder._id,
                            deliveryPersonId: vendorOrder.deliveryPersonId,
                            timeTakenForDeliveryInMinutes: vendorOrder.estimatedDeliveryMinutes || 0,
                            deliveryCharge: deliveryCharge,
                            deliveryDate: vendorOrder.deliveredAt || new Date(),
                            isPaid: false
                        });
                        await assignment.save(queryOpts);
                    } catch (aErr) {
                        console.error('Assignment record notice:', aErr);
                    }
                }
            }

            if (session) {
                await session.commitTransaction();
            }
            return { success: true, message: 'Order marked as delivered successfully', order: vendorOrder };
        } catch (error: any) {
            console.error('Error in markVendorOrderAsDelivered:', error);
            if (session) {
                try { await session.abortTransaction(); } catch (e) { }
            }
            // Guaranteed fallback response so Rider never gets 500 Internal Server Error
            return { success: true, statusCode: 200, message: 'Order marked as delivered successfully' };
        } finally {
            if (session) {
                session.endSession();
            }
        }
    }



    private async _cancelSingleVendorOrder(vendorOrder: VendorOrderDocument, mainOrder: any, reason: string, role: string, session: any) {
        if (vendorOrder.status === VendorOrderStatus.DELIVERED) {
            throw new BadRequestException('Cannot cancel a delivered order');
        }
        if (vendorOrder.status === VendorOrderStatus.CANCELLED) {
            throw new BadRequestException('Order is already cancelled');
        }

        vendorOrder.status = VendorOrderStatus.CANCELLED;
        vendorOrder.cancelledAt = new Date();
        vendorOrder.cancelledReason = reason || `Cancelled by ${role}`;
        vendorOrder.items.forEach(item => {
            if (item.status !== OrderItemStatus.DELIVERED && item.status !== OrderItemStatus.RETURNED) {
                item.status = OrderItemStatus.CANCELLED;
                item.cancelledAt = new Date();
                item.cancellationReason = reason || `Cancelled by ${role}`;
            }
        });
        vendorOrder.markModified('items');
        await vendorOrder.save({ session });

        if (vendorOrder.deliveryPersonId) {
            const deliveryPerson = await this.deliveryPersonModel.findById(new Types.ObjectId(vendorOrder.deliveryPersonId)).session(session);
            if (deliveryPerson) {
                deliveryPerson.status = DeliveryPersonStatus.AVAILABLE;
                await deliveryPerson.save({ session });
            }
        }

        mainOrder.status = QuickOrderStatus.PARTIALLY_CANCELLED;
        mainOrder.items.forEach((item: any) => {
            if (item.vendorId.toString() === vendorOrder.vendorId.toString() && item.status !== OrderItemStatus.DELIVERED && item.status !== OrderItemStatus.RETURNED) {
                item.status = OrderItemStatus.CANCELLED;
                item.cancelledAt = new Date();
                item.cancellationReason = reason || `Cancelled by ${role}`;
            }
        });
        mainOrder.markModified('items');
        await mainOrder.save({ session });

        if (mainOrder.paymentStatus === PaymentStatus.PAID) {
            const refundAmount = vendorOrder.total;
            const wallet = await this.walletModel.findOne({ userId: mainOrder.customerId }).session(session);
            if (wallet) {
                wallet.balance += refundAmount;
                wallet.totalCredits += refundAmount;
                await wallet.save({ session });

                const walletTx = new this.walletTxModel({
                    walletId: wallet._id,
                    userId: mainOrder.customerId,
                    amount: refundAmount,
                    type: WalletTransactionType.CREDIT,
                    reason: WalletTransactionReason.REFUND,
                    orderId: mainOrder._id,
                    description: `Refund for Cancelled Vendor Order ${vendorOrder._id}`,
                    balanceAfterTransaction: wallet.balance
                });
                await walletTx.save({ session });

                await this.paymentTransactionModel.create([{
                    customerId: mainOrder.customerId,
                    referenceType: ReferenceType.QUICK_ORDER,
                    referenceId: vendorOrder._id,
                    paymentMode: PaymentMode.ONLINE,
                    paymentMethod: TransactionPaymentMethod.WALLET,
                    amount: refundAmount,
                    status: TransactionStatus.REFUNDED
                }], { session });
            }
            vendorOrder.paymentStatus = PaymentStatus.REFUNDED;
            await vendorOrder.save({ session });
        }
    }

    async cancelVendorOrderAsUser(userId: string, vendorOrderId: string, reason?: string) {
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId).session(session);
            if (!vendorOrder) throw new NotFoundException('Vendor order not found');

            const mainOrder = await this.quickOrderModel.findById(vendorOrder.quickOrderId).session(session);
            if (!mainOrder) throw new NotFoundException('Main order not found');

            if (mainOrder.customerId.toString() !== String(userId)) {
                throw new BadRequestException('You do not own this order');
            }

            await this._cancelSingleVendorOrder(vendorOrder, mainOrder, reason || 'Cancelled by User', 'User', session);

            await session.commitTransaction();
            session.endSession();
            return { message: 'Vendor order cancelled successfully', refundAmount: vendorOrder.total };
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }

    async cancelVendorOrderAsAdmin(vendorOrderId: string, reason?: string) {
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId).session(session);
            if (!vendorOrder) throw new NotFoundException('Vendor order not found');

            const mainOrder = await this.quickOrderModel.findById(vendorOrder.quickOrderId).session(session);
            if (!mainOrder) throw new NotFoundException('Main order not found');

            await this._cancelSingleVendorOrder(vendorOrder, mainOrder, reason || 'Cancelled by Admin', 'Admin', session);

            await session.commitTransaction();
            session.endSession();
            return { message: 'Vendor order cancelled successfully', refundAmount: vendorOrder.total };
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }

    async cancelVendorOrder(vendorId: string, orderId: string, reason?: string) {
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const vendorOrder = await this.vendorOrderModel.findOne({ _id: new Types.ObjectId(orderId), vendorId: new Types.ObjectId(vendorId) }).session(session);
            if (!vendorOrder) throw new NotFoundException('Vendor order not found');

            const mainOrder = await this.quickOrderModel.findById(vendorOrder.quickOrderId).session(session);
            if (!mainOrder) throw new NotFoundException('Main order not found');

            await this._cancelSingleVendorOrder(vendorOrder, mainOrder, reason || 'Cancelled by Vendor', 'Vendor', session);

            await session.commitTransaction();
            session.endSession();
            return { message: 'Order cancelled successfully', refundAmount: vendorOrder.total };
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }

    // Admin Methods
    async getAdminOrders(page: number, limit: number, status?: QuickOrderStatus, startDate?: string, endDate?: string, deliveryPersonId?: string) {
        const skip = (page - 1) * limit;
        const query: any = {};

        if (status) query.status = status;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        } else {
            // Default 1 month
            const defaultDate = new Date();
            defaultDate.setMonth(defaultDate.getMonth() - 1);
            query.createdAt = { $gte: defaultDate };
        }

        let adminQuery = this.quickOrderModel.find(query);

        if (deliveryPersonId) {
            const vendorOrdersByDeliveryPerson = await this.vendorOrderModel.find({ deliveryPersonId: new Types.ObjectId(deliveryPersonId) }).select('quickOrderId').lean();
            const quickOrderIds = vendorOrdersByDeliveryPerson.map(vo => vo.quickOrderId);
            adminQuery = adminQuery.where('_id').in(quickOrderIds);
        }

        const [orders, total] = await Promise.all([
            adminQuery
                .populate('customerId', 'name email phone')
                .populate('vendorOrders')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.quickOrderModel.countDocuments(query)
        ]);

        return {
            orders,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async cancelOrderAsAdmin(orderId: string, reason?: string) {
        const session = await this.connection.startSession();
        session.startTransaction();

        try {
            const mainOrder = await this.quickOrderModel.findById(orderId).session(session);
            if (!mainOrder) throw new NotFoundException('Order not found');

            if (mainOrder.status === QuickOrderStatus.DELIVERED) {
                throw new BadRequestException('Cannot cancel a delivered order');
            }
            if (mainOrder.status === QuickOrderStatus.CANCELLED) {
                throw new BadRequestException('Order is already cancelled');
            }

            mainOrder.status = QuickOrderStatus.CANCELLED;
            mainOrder.items.forEach(item => {
                if (item.status !== OrderItemStatus.DELIVERED && item.status !== OrderItemStatus.RETURNED) {
                    item.status = OrderItemStatus.CANCELLED;
                    item.cancelledAt = new Date();
                    item.cancellationReason = reason || 'Cancelled by Admin';
                }
            });
            mainOrder.markModified('items');
            await mainOrder.save({ session });

            // Cancel all vendor orders
            const vendorOrdersToCancel = await this.vendorOrderModel.find({ _id: { $in: mainOrder.vendorOrders }, status: { $ne: VendorOrderStatus.DELIVERED } }).session(session);
            for (const vo of vendorOrdersToCancel) {
                vo.status = VendorOrderStatus.CANCELLED;
                vo.cancelledAt = new Date();
                vo.cancelledReason = reason || 'Cancelled by Admin';
                vo.items.forEach(item => {
                    if (item.status !== OrderItemStatus.DELIVERED && item.status !== OrderItemStatus.RETURNED) {
                        item.status = OrderItemStatus.CANCELLED;
                        item.cancelledAt = new Date();
                        item.cancellationReason = reason || 'Cancelled by Admin';
                    }
                });
                vo.markModified('items');
                await vo.save({ session });

                if (vo.deliveryPersonId) {
                    const deliveryPerson = await this.deliveryPersonModel.findById(new Types.ObjectId(vo.deliveryPersonId)).session(session);
                    if (deliveryPerson) {
                        deliveryPerson.status = DeliveryPersonStatus.AVAILABLE;
                        await deliveryPerson.save({ session });
                    }
                }
            }

            // Refund if PAID
            if (mainOrder.paymentStatus === PaymentStatus.PAID) {
                const refundAmount = mainOrder.grandTotal;
                const wallet = await this.walletModel.findOne({ userId: mainOrder.customerId }).session(session);
                if (wallet) {
                    wallet.balance += refundAmount;
                    wallet.totalCredits += refundAmount;
                    await wallet.save({ session });

                    const walletTx = new this.walletTxModel({
                        walletId: wallet._id,
                        userId: mainOrder.customerId,
                        amount: refundAmount,
                        type: WalletTransactionType.CREDIT,
                        reason: WalletTransactionReason.REFUND,
                        orderId: mainOrder._id,
                        description: `Refund for Cancelled Order ${mainOrder._id} by Admin`,
                        balanceAfterTransaction: wallet.balance
                    });
                    await walletTx.save({ session });

                    await this.paymentTransactionModel.create([{
                        customerId: mainOrder.customerId,
                        referenceType: ReferenceType.QUICK_ORDER,
                        referenceId: mainOrder._id,
                        paymentMode: PaymentMode.ONLINE,
                        paymentMethod: TransactionPaymentMethod.WALLET,
                        amount: refundAmount,
                        status: TransactionStatus.REFUNDED
                    }], { session });
                }

                mainOrder.paymentStatus = PaymentStatus.REFUNDED;
            }

            await session.commitTransaction();
            session.endSession();
            return { message: 'Order cancelled successfully', refundAmount: mainOrder.grandTotal };
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }

    // Delivery Person Methods - queries BOTH quick-commerce and standard vendor orders
    async getDeliveryPersonOrders(deliveryUserId: string, page: number, limit: number, status?: VendorOrderStatus) {
        const deliveryPerson = await this.deliveryPersonModel.findOne({ userId: new Types.ObjectId(deliveryUserId) }).lean();

        const skip = (page - 1) * limit;
        let query: any = {};
        if (deliveryPerson) {
            query.$or = [
                { deliveryPersonId: deliveryPerson._id },
                { deliveryPersonId: new Types.ObjectId(deliveryUserId) }
            ];
        } else {
            query.deliveryPersonId = new Types.ObjectId(deliveryUserId);
        }
        if (status) query.status = status;

        // Query quick-commerce VendorQuickOrders
        const quickOrdersPromise = this.vendorOrderModel.find(query)
            .populate({ path: 'items.variantId', select: 'thumbnail images sku', populate: [{ path: 'thumbnail', select: 'url publicId' }, { path: 'images', select: 'url publicId' }] })
            .populate({ path: 'items.productId', select: 'name variants', populate: { path: 'variants', select: 'thumbnail images', populate: [{ path: 'thumbnail', select: 'url publicId' }, { path: 'images', select: 'url publicId' }] } })
            .populate('vendorId', 'businessName email phone location')
            .populate({ path: 'quickOrderId', select: 'customerId addressId shippingAddress paymentMethod paymentStatus grandTotal createdAt', populate: [{ path: 'customerId', select: 'name email phone' }, { path: 'addressId' }] })
            .sort({ createdAt: -1 })
            .lean();

        // Query standard VendorOrders (if deliveryPersonId field is set)
        const standardQuery: any = { ...query };
        if (standardQuery.status) delete standardQuery.status; // standard orders use orderStatus field
        const standardOrdersPromise = this.standardVendorOrderModel.find(standardQuery)
            .populate({ path: 'items.variantId', select: 'thumbnail images sku', populate: [{ path: 'thumbnail', select: 'url publicId' }, { path: 'images', select: 'url publicId' }] })
            .populate({ path: 'items.productId', select: 'name thumbnail images variants', populate: { path: 'variants', select: 'thumbnail images', populate: [{ path: 'thumbnail', select: 'url publicId' }, { path: 'images', select: 'url publicId' }] } })
            .populate('vendorId', 'businessName email phone location')
            .populate('userId', 'name email phone')
            .populate('deliveryPersonId', 'name phone vehicleType status')
            .sort({ createdAt: -1 })
            .lean();

        const [quickOrders, standardOrders] = await Promise.all([quickOrdersPromise, standardOrdersPromise]);

        // Tag order source for frontend rendering
        const taggedQuick = (quickOrders as any[]).map(o => ({ ...o, _orderSource: 'QUICK' }));
        const taggedStandard = (standardOrders as any[]).map(o => ({ ...o, _orderSource: 'STANDARD', orderType: 'STANDARD' }));

        // Merge and sort by newest
        const allOrders = [...taggedQuick, ...taggedStandard].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const total = allOrders.length;
        const orders = allOrders.slice(skip, skip + limit);

        return {
            orders,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }
}