import Producto from '../models/Producto.js';
import logger from '../logger.js';

export async function applyEntryToStateMachine(entry, nodeId) {
  if (!entry || !entry.command) return null;

  const { action, data, id } = entry.command;
  logger.info(`[StateMachine] [${nodeId}] Aplicando entrada Index ${entry.index} (Term ${entry.term}): ${action}`);

  try {
    switch (action) {
      case 'CREATE_PRODUCTO': {
        // Verificar si ya existe por código o _id para idempotencia
        const existe = await Producto.findOne({ codigo: data.codigo });
        if (existe) {
          logger.info(`[StateMachine] [${nodeId}] Producto con código ${data.codigo} ya existe. Omitiendo duplicado.`);
          return existe;
        }
        const nuevo = await Producto.create(data);
        logger.info(`[StateMachine] [${nodeId}] Producto creado en MongoDB local: ${nuevo.codigo} (_id: ${nuevo._id})`);
        return nuevo;
      }

      case 'UPDATE_PRODUCTO': {
        const actualizado = await Producto.findByIdAndUpdate(id, { $set: data }, { new: true });
        if (!actualizado) {
          // Intentar actualizar por código si id no es ObjectId
          const actPorCod = await Producto.findOneAndUpdate({ codigo: id.toUpperCase() }, { $set: data }, { new: true });
          logger.info(`[StateMachine] [${nodeId}] Producto actualizado en MongoDB local por código: ${id}`);
          return actPorCod;
        }
        logger.info(`[StateMachine] [${nodeId}] Producto actualizado en MongoDB local: ${id}`);
        return actualizado;
      }

      case 'DELETE_PRODUCTO': {
        const borrado = await Producto.findByIdAndDelete(id);
        if (!borrado) {
          await Producto.findOneAndDelete({ codigo: id.toUpperCase() });
        }
        logger.info(`[StateMachine] [${nodeId}] Producto eliminado de MongoDB local: ${id}`);
        return { success: true, id };
      }

      case 'RESERVAR_STOCK': {
        const prod = await Producto.findById(id) || await Producto.findOne({ codigo: id.toUpperCase() });
        if (prod && prod.stock > 0) {
          prod.stock -= 1;
          await prod.save();
          logger.info(`[StateMachine] [${nodeId}] Reserva realizada. Nuevo stock de ${prod.codigo}: ${prod.stock}`);
          return prod;
        } else {
          logger.warn(`[StateMachine] [${nodeId}] Intento de reserva sin stock para ${id}`);
          return null;
        }
      }

      default:
        logger.warn(`[StateMachine] [${nodeId}] Acción desconocida en StateMachine: ${action}`);
        return null;
    }
  } catch (err) {
    logger.error(`[StateMachine Error] [${nodeId}] Error al aplicar comando: ${err.message}`);
    return null;
  }
}
