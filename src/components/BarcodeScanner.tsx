'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface Product {
  name: string;
  brand: string;
  image: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  servingSize: string;
  barcode: string;
}

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdd: (product: Product, quantity: number) => void;
}

export default function BarcodeScanner({ isOpen, onClose, onProductAdd }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (isOpen && !product) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setScanning(true);
      setError(null);
      
      const html5QrCode = new Html5Qrcode("barcode-reader");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        async (decodedText) => {
          await stopScanner();
          await fetchProduct(decodedText);
        },
        () => {} // Ignore errors during scanning
      );
    } catch (err) {
      setError('Kamera konnte nicht gestartet werden');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {
        // Ignore stop errors
      }
    }
    setScanning(false);
  };

  const fetchProduct = async (barcode: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}`);
      const data = await response.json();
      
      if (data.status === 1 && data.product) {
        const p = data.product;
        const nutriments = p.nutriments || {};
        
        setProduct({
          name: p.product_name_de || p.product_name || 'Unbekanntes Produkt',
          brand: p.brands || '',
          image: p.image_front_small_url || p.image_url || '',
          nutrition: {
            calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0),
            protein: Math.round(nutriments.proteins_100g || nutriments.proteins || 0),
            carbs: Math.round(nutriments.carbohydrates_100g || nutriments.carbohydrates || 0),
            fat: Math.round(nutriments.fat_100g || nutriments.fat || 0),
          },
          servingSize: p.serving_size || '100g',
          barcode: barcode,
        });
      } else {
        setError('Produkt nicht gefunden. Versuche einen anderen Barcode.');
        setTimeout(() => startScanner(), 2000);
      }
    } catch (err) {
      setError('Fehler beim Laden des Produkts');
      setTimeout(() => startScanner(), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (product) {
      onProductAdd(product, quantity);
      handleClose();
    }
  };

  const handleClose = () => {
    stopScanner();
    setProduct(null);
    setQuantity(1);
    setError(null);
    onClose();
  };

  const handleRescan = () => {
    setProduct(null);
    setQuantity(1);
    startScanner();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {product ? '📦 Produkt gefunden' : '📷 Barcode scannen'}
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!product ? (
            <>
              {/* Scanner View */}
              <div id="barcode-reader" className="w-full rounded-xl overflow-hidden bg-gray-900" style={{ minHeight: 300 }} />
              
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
                  <span className="ml-3 text-gray-600">Produkt wird geladen...</span>
                </div>
              )}
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 rounded-xl text-red-600 text-center">
                  {error}
                </div>
              )}
              
              <p className="text-center text-gray-500 text-sm mt-4">
                Halte den Barcode in den Rahmen
              </p>
            </>
          ) : (
            <>
              {/* Product View */}
              <div className="flex gap-4 mb-4">
                {product.image && (
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-24 h-24 object-contain rounded-xl bg-gray-50"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  {product.brand && (
                    <p className="text-sm text-gray-500">{product.brand}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">pro 100g</p>
                </div>
              </div>

              {/* Nutrition Facts */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-teal-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-teal-600">{product.nutrition.calories}</p>
                  <p className="text-xs text-gray-500">kcal</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-red-500">{product.nutrition.protein}g</p>
                  <p className="text-xs text-gray-500">Protein</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-yellow-600">{product.nutrition.carbs}g</p>
                  <p className="text-xs text-gray-500">Carbs</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-blue-500">{product.nutrition.fat}g</p>
                  <p className="text-xs text-gray-500">Fett</p>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 mb-4">
                <span className="text-gray-700">Menge (Portionen à 100g)</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(0.5, quantity - 0.5))}
                    className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-xl font-bold"
                  >
                    −
                  </button>
                  <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 0.5)}
                    className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center text-xl font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Calculated Totals */}
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <p className="text-sm text-gray-500 mb-1">Wird hinzugefügt:</p>
                <p className="font-semibold">
                  {Math.round(product.nutrition.calories * quantity)} kcal · {Math.round(product.nutrition.protein * quantity)}g Protein
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleRescan}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                >
                  🔄 Neu scannen
                </button>
                <button
                  onClick={handleAdd}
                  className="flex-1 py-3 px-4 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600"
                >
                  ✓ Hinzufügen
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
