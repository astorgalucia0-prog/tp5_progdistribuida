import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'El nombre de usuario es obligatorio'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'El username debe tener al menos 3 caracteres']
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'El formato del email es inválido']
    },
    passwordHash: {
      type: String,
      required: [true, 'El hash de contraseña es obligatorio']
    },
    role: {
      type: String,
      enum: {
        values: ['USER', 'ADMIN'],
        message: 'El rol debe ser USER o ADMIN'
      },
      default: 'USER'
    },
    nombre: {
      type: String,
      trim: true,
      default: ''
    },
    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.statics.hashPassword = async function (plainPassword, rounds = 12) {
  return bcrypt.hash(plainPassword, rounds);
};

export const User = mongoose.model('User', userSchema);
