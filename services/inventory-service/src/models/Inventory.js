import mongoose from 'mongoose';

const reservaSchema = new mongoose.Schema(
  {
    reservation_id: {
      type: String,
      required: true
    },
    order_id: {
      type: String,
      required: true
    },
    cantidad: {
      type: Number,
      required: true,
      min: 1
    },
    expira_at: {
      type: Date,
      required: true
    },
    estado: {
      type: String,
      enum: ['RESERVED', 'CONFIRMED', 'RELEASED'],
      default: 'RESERVED'
    }
  },
  { _id: false, timestamps: true }
);

const inventorySchema = new mongoose.Schema(
  {
    product_code: {
      type: String,
      required: [true, 'El código de producto es obligatorio'],
      unique: true,
      trim: true,
      uppercase: true
    },
    stock_total: {
      type: Number,
      required: true,
      min: [0, 'El stock total no puede ser negativo'],
      validate: {
        validator: Number.isInteger,
        message: 'El stock total debe ser un número entero'
      }
    },
    stock_disponible: {
      type: Number,
      required: true,
      min: [0, 'El stock disponible no puede ser negativo'],
      validate: {
        validator: Number.isInteger,
        message: 'El stock disponible debe ser un número entero'
      }
    },
    stock_reservado: {
      type: Number,
      default: 0,
      min: [0, 'El stock reservado no puede ser negativo'],
      validate: {
        validator: Number.isInteger,
        message: 'El stock reservado debe ser un número entero'
      }
    },
    reservas: [reservaSchema]
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

const Inventory = mongoose.model('Inventory', inventorySchema);

export default Inventory;
