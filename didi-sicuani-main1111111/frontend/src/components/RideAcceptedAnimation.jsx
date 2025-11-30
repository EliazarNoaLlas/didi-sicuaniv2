import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Componente de animación elegante cuando un conductor acepta la solicitud del pasajero
 */
export default function RideAcceptedAnimation({ show, driverInfo, onClose }) {
  const [isVisible, setIsVisible] = useState(show);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setIsVisible(show);
    if (show) {
      setShowConfetti(true);
      // Detener confetti después de 3 segundos
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!isVisible) return null;

  // Colores para confetti
  const confettiColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Confetti animado */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0,
                  opacity: 1,
                  rotate: 0,
                }}
                animate={{
                  x: `${50 + (Math.random() - 0.5) * 200}%`,
                  y: `${50 + (Math.random() - 0.5) * 200}%`,
                  scale: [0, 1, 0.8, 0],
                  opacity: [1, 1, 0.8, 0],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 2 + Math.random(),
                  delay: Math.random() * 0.5,
                  ease: 'easeOut',
                }}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  backgroundColor: confettiColors[Math.floor(Math.random() * confettiColors.length)],
                  left: '50%',
                  top: '50%',
                }}
              />
            ))}
          </div>
        )}

        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ 
            type: 'spring', 
            stiffness: 300, 
            damping: 30,
            duration: 0.5 
          }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full mx-4 relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradiente de fondo sutil */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 opacity-50" />
          
          {/* Contenido */}
          <div className="relative z-10">
            {/* Icono de éxito animado con efecto de pulso */}
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="relative"
              >
                {/* Círculo exterior con pulso */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute inset-0 bg-green-500 rounded-full"
                />
                
                {/* Círculo principal */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                  className="relative w-28 h-28 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg"
                >
                  <motion.svg
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="w-14 h-14 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <motion.path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </motion.svg>
                </motion.div>
              </motion.div>
            </div>

            {/* Título con efecto de escritura */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-4xl font-bold text-center bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2"
            >
              ¡Conductor Aceptado!
            </motion.h2>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-center text-gray-600 mb-8 text-lg"
            >
              Tu solicitud ha sido aceptada
            </motion.p>

            {/* Información del conductor con diseño mejorado */}
            {driverInfo && (
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 mb-6 border border-gray-200 shadow-inner"
              >
                {/* Header del conductor */}
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7, type: 'spring' }}
                    className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg"
                  >
                    {driverInfo.driverName?.charAt(0)?.toUpperCase() || 'C'}
                  </motion.div>
                  <div className="flex-1">
                    <motion.h3
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="font-bold text-xl text-gray-800 mb-1"
                    >
                      {driverInfo.driverName || 'Conductor'}
                    </motion.h3>
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.9 }}
                      className="flex items-center gap-2"
                    >
                      <span className="text-yellow-500 text-xl">⭐</span>
                      <span className="font-semibold text-gray-700">
                        {driverInfo.driverRating?.toFixed(1) || '5.0'}
                      </span>
                      {driverInfo.driverTotalRides && (
                        <span className="text-sm text-gray-500">
                          • {driverInfo.driverTotalRides} viajes
                        </span>
                      )}
                    </motion.div>
                  </div>
                </div>

                {/* Información del vehículo */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 1.0 }}
                    className="bg-white rounded-xl p-3 shadow-sm"
                  >
                    <p className="text-xs text-gray-500 mb-1">Vehículo</p>
                    <p className="font-bold text-lg">🚕 Taxi</p>
                    {driverInfo.vehiclePlate && (
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        {driverInfo.vehiclePlate}
                      </p>
                    )}
                    {driverInfo.vehicleModel && (
                      <p className="text-xs text-gray-400">{driverInfo.vehicleModel}</p>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 1.1 }}
                    className="bg-white rounded-xl p-3 shadow-sm"
                  >
                    <p className="text-xs text-gray-500 mb-1">Distancia</p>
                    <p className="font-bold text-lg text-blue-600">
                      {driverInfo.driverDistanceKm?.toFixed(1) || 'N/A'} km
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      ETA: {driverInfo.driverEtaMin || 'N/A'} min
                    </p>
                  </motion.div>
                </div>

                {/* Precio destacado */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.2, type: 'spring' }}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-center shadow-lg"
                >
                  <p className="text-sm text-white/90 mb-1">Precio Acordado</p>
                  <p className="text-3xl font-bold text-white">
                    S/ {Number(driverInfo.agreedPrice || driverInfo.precioAcordado || 0).toFixed(2)}
                  </p>
                </motion.div>

                {/* Información adicional si está disponible */}
                {(driverInfo.driverPhone || driverInfo.originAddress) && (
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.3 }}
                    className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm"
                  >
                    {driverInfo.originAddress && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400">📍</span>
                        <div>
                          <p className="text-gray-500">Origen:</p>
                          <p className="text-gray-700 font-medium">{driverInfo.originAddress}</p>
                        </div>
                      </div>
                    )}
                    {driverInfo.destinationAddress && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400">🎯</span>
                        <div>
                          <p className="text-gray-500">Destino:</p>
                          <p className="text-gray-700 font-medium">{driverInfo.destinationAddress}</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Botones mejorados */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.4 }}
              className="flex gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Ver Detalles
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-6 py-4 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cerrar
              </motion.button>
            </motion.div>
          </div>

          {/* Efecto de brillo animado */}
          <motion.div
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
              ease: 'linear',
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
