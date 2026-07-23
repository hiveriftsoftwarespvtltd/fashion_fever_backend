import re

# 1. Fix quick-delivery-order.service.ts
service_file = r"d:\Projects\wake_up_makeup_development\src\quick-e-commerce\quick-delivery-order.service.ts"
with open(service_file, 'r') as f:
    content = f.read()

content = content.replace("let uploadedProofIds = [];", "let uploadedProofIds: string[] = [];")
content = content.replace("uploadedProofIds = uploadRes.data.map((m) => m._id.toString());", "if (uploadRes && uploadRes.data) {\n                uploadedProofIds = uploadRes.data.map((m: any) => m._id.toString());\n            }")

content = content.replace("let currentInfluencerUserId = null;", "let currentInfluencerUserId: Types.ObjectId | null = null;")
content = content.replace("let currentDeliveryPersonUserId = null;", "let currentDeliveryPersonUserId: Types.ObjectId | null = null;")

with open(service_file, 'w') as f:
    f.write(content)

# 2. Fix vendor-quick-order.controller.ts
controller_file = r"d:\Projects\wake_up_makeup_development\src\quick-e-commerce\vendor-quick-order.controller.ts"
with open(controller_file, 'r') as f:
    ctrl_content = f.read()

ctrl_replacement = """        return this.quickOrderService.getVendorOrders(
            req.user.vendorId,
            query.page || 1,
            query.limit || 10,
            query.status,
            query.deliveryPersonId
        );"""

ctrl_content = re.sub(
    r"return this\.quickOrderService\.getVendorOrders\(\s*req\.user\.vendorId,\s*query\.page \|\| 1,\s*query\.limit \|\| 10,\s*query\.status\s*\);",
    ctrl_replacement,
    ctrl_content
)

with open(controller_file, 'w') as f:
    f.write(ctrl_content)
