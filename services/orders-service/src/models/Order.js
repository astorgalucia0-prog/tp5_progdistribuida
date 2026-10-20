import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product_code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    nombre: {
      type: String,
      required: true
    },
    cantidad: {
      type: Number,
      required: true,
      min: 1
    },
    precio_unitario: {
      type: Number,
      required: true,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    order_id: {
      type: String,
      required: [true, 'El order_id es obligatorio'],
      unique: true,
      trim: true
    },
    customer_id: {
      type: String,
      required: [true, 'El customer_id es obligatorio'],
      trim: true
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'La orden debe contener al menos un producto'
      }
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    reservation_id: {
      type: String,
      default: null
    },
    estado: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED_OUT_OF_STOCK'],
      default: 'PENDING'
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
