'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProductByBarcode, calculateNutritionForQuantity, ProductResult } from '@/lib/openFoodFacts';
import { ScannedItem } from '@/types';

// Dynamic import for Capacitor - only available in native app
let BarcodeScanner: any = null;
let isNativeApp = false;

if (typeof window !== 'undefined') {
  // Check if running in Capacitor
  isNativeApp = !!(window as any).Capacitor?.isNativePlatform?.();
  
  if (isNativeApp) {
    import('@capacitor-community/barcode-scanner').then(module => {
      BarcodeScanner = module.BarcodeScanner;
    }).catch(() => {
      // Not available
    });
  }
}

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: ScannedItem) => void;
}

type ModalStep = 'scanner' | 'loading' | 'product' | 'manual' | 'notfound';

export default function BarcodeScannerModal({ isOpen, onClose, onAddItem }: BarcodeScannerModalProps) {
  const [step, setStep] = useState<ModalStep>('scanner');
  const [product, setProduct] = useState<ProductResult | null>(null);
  const [quantity, setQuantity] = useState<number>(100);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<any>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  
  // Manual entry state
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');

  const stopScanning = useCallback(async () => {
    try {
      // Stop web scanner
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      }
      // Stop native scanner
      if (isNativeApp && BarcodeScanner) {
        await BarcodeScanner.stopScan();
      }
      document.body.classList.remove('barcode-scanner-active');
      setIsScanning(false);
    } catch (error) {
      console.error('Error stopping scan:', error);
    }
  }, []);

  const handleClose = useCallback(() => {
    stopScanning();
    setStep('scanner');
    setProduct(null);
    setQuantity(100);
    setManualName('');
    setManualCalories('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
    setManualBarcode('');
    onClose();
  }, [onClose, stopScanning]);

  const startScanning = useCallback(async () => {
    try {
      setIsScanning(true);
      
      if (isNativeApp && BarcodeScanner) {
        // Native app - use Capacitor scanner
        const status = await BarcodeScanner.checkPermission({ force: true });
        
        if (!status.granted) {
          alert('Kamera-Berechtigung wird benötigt um Barcodes zu scannen.');
          setIsScanning(false);
          return;
        }

        document.body.classList.add('barcode-scanner-active');

        const result = await BarcodeScanner.startScan({
          targetedFormats: ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E'],
        });

        setIsScanning(false);
        document.body.classList.remove('barcode-scanner-active');

        if (result.hasContent && result.content) {
          await handleBarcodeScanned(result.content);
        }
      } else {
        // Web - use html5-qrcode
        const { Html5Qrcode } = await import('html5-qrcode');
        
        const scannerId = 'barcode-scanner-web';
        
        // Create scanner element if not exists
        if (!document.getElementById(scannerId)) {
          const div = document.createElement('div');
          div.id = scannerId;
          scannerContainerRef.current?.appendChild(div);
        }
        
        const html5QrCode = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
          },
          async (decodedText: string) => {
            await stopScanning();
            await handleBarcodeScanned(decodedText);
          },
          () => {} // Ignore intermediate errors
        );
      }
    } catch (error) {
      console.error('Error scanning:', error);
      setIsScanning(false);
      document.body.classList.remove('barcode-scanner-active');
      // Fallback to manual entry
      setStep('manual');
    }
  }, [stopScanning]);

  const handleBarcodeScanned = async (barcode: string) => {
    setStep('loading');
    setManualBarcode(barcode);
    
    const result = await fetchProductByBarcode(barcode);
    
    if (result.found) {
      setProduct(result);
      setQuantity(result.servingSize);
      setStep('product');
    } else {
      setStep('notfound');
    }
  };

  const handleAddProduct = () => {
    if (!product) return;

    const nutrition = calculateNutritionForQuantity(product.nutritionPer100g, quantity);
    
    const item: ScannedItem = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      barcode: product.barcode,
      name: product.name,
      brand: product.brand,
      quantity,
      servingSize: product.servingSize,
      nutrition,
      imageUrl: product.imageUrl,
      addedAt: Date.now(),
    };

    onAddItem(item);
    handleClose();
  };

  const handleAddManual = () => {
    if (!manualName || !manualCalories) return;

    const item: ScannedItem = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      barcode: manualBarcode || 'manual',
      name: manualName,
      quantity,
      servingSize: quantity,
      nutrition: {
        calories: parseInt(manualCalories) || 0,
        protein: parseFloat(manualProtein) || 0,
        carbs: parseFloat(manualCarbs) || 0,
        fat: parseFloat(manualFat) || 0,
      },
      addedAt: Date.now(),
    };

    onAddItem(item);
    handleClose();
  };

  useEffect(() => {
    if (isOpen && step === 'scanner') {
      startScanning();
    }
    
    return () => {
      if (isScanning) {
        stopScanning();
      }
    };
  }, [isOpen, step, startScanning, stopScanning, isScanning]);

  if (!isOpen) return null;

  const calculatedNutrition = product 
    ? calculateNutritionForQuantity(product.nutritionPer100g, quantity)
    : null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

      {/* Scanner View (when actively scanning) */}
      {isScanning && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="relative" ref={scannerContainerRef}>
            {/* Web Scanner Container (html5-qrcode renders here) */}
            {!isNativeApp && (
              <div id="barcode-scanner-web" className="w-72 h-72 rounded-2xl overflow-hidden" />
            )}
            
            {/* Native Scanner Frame Overlay */}
            {isNativeApp && (
              <div className="w-72 h-72 border-4 border-white rounded-2xl relative">
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-teal-500 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-teal-500 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-teal-500 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-teal-500 rounded-br-lg" />
                
                {/* Scanning line animation */}
                <div className="absolute inset-4 overflow-hidden">
                  <div className="w-full h-0.5 bg-teal-500 animate-pulse" 
                       style={{ animation: 'scan-line 2s ease-in-out infinite' }} />
                </div>
              </div>
            )}
          </div>
          
          <p className="text-white text-center mt-6 text-lg font-medium">
            Barcode in den Rahmen halten
          </p>
          
          <button
            onClick={handleClose}
            className="mt-8 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium"
          >
            Abbrechen
          </button>
          
          <button
            onClick={() => {
              stopScanning();
              setStep('manual');
            }}
            className="mt-4 text-white/80 underline"
          >
            Manuell eingeben
          </button>
        </div>
      )}

      {/* Modal Content */}
      {!isScanning && (
        <div className="absolute inset-x-4 bottom-4 top-auto max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">
              {step === 'loading' && '🔍 Suche Produkt...'}
              {step === 'product' && '✅ Produkt gefunden'}
              {step === 'notfound' && '❌ Nicht gefunden'}
              {step === 'manual' && '✏️ Manuell eingeben'}
            </h2>
            <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Loading State */}
          {step === 'loading' && (
            <div className="p-8 flex flex-col items-center justify-center">
              <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full" />
              <p className="text-gray-500 mt-4">Suche in Open Food Facts...</p>
            </div>
          )}

          {/* Product Found */}
          {step === 'product' && product && calculatedNutrition && (
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* Product Info */}
              <div className="flex gap-4 mb-6">
                {product.imageUrl && (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-20 h-20 object-cover rounded-xl bg-gray-100"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">{product.name}</h3>
                  {product.brand && (
                    <p className="text-gray-500 text-sm">{product.brand}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Barcode: {product.barcode}</p>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Menge (g/ml)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(10, quantity - 10))}
                    className="w-12 h-12 rounded-xl bg-white border border-gray-200 text-xl font-bold text-gray-600"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                    className="flex-1 text-center text-2xl font-bold py-2 px-4 rounded-xl border border-gray-200"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 10)}
                    className="w-12 h-12 rounded-xl bg-white border border-gray-200 text-xl font-bold text-gray-600"
                  >
                    +
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  {[50, 100, 150, 200, product.servingSize].filter((v, i, a) => a.indexOf(v) === i).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setQuantity(preset)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        quantity === preset 
                          ? 'bg-teal-600 text-white' 
                          : 'bg-white border border-gray-200 text-gray-600'
                      }`}
                    >
                      {preset}g
                    </button>
                  ))}
                </div>
              </div>

              {/* Nutrition Display */}
              <div className="bg-teal-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-teal-700 font-medium mb-3">Nährwerte für {quantity}g:</p>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-teal-600">{calculatedNutrition.calories}</p>
                    <p className="text-xs text-gray-500">kcal</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-500">{calculatedNutrition.protein}g</p>
                    <p className="text-xs text-gray-500">Protein</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-500">{calculatedNutrition.carbs}g</p>
                    <p className="text-xs text-gray-500">Carbs</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-500">{calculatedNutrition.fat}g</p>
                    <p className="text-xs text-gray-500">Fett</p>
                  </div>
                </div>
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddProduct}
                className="w-full py-4 bg-teal-600 text-white rounded-xl font-semibold text-lg hover:bg-teal-700 transition-colors"
              >
                ➕ Hinzufügen
              </button>
            </div>
          )}

          {/* Product Not Found */}
          {step === 'notfound' && (
            <div className="p-4">
              <div className="text-center py-6">
                <div className="text-5xl mb-4">📦</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Produkt nicht gefunden</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Barcode: {manualBarcode}
                </p>
                <p className="text-gray-500 text-sm">
                  Das Produkt ist nicht in der Open Food Facts Datenbank.
                  Du kannst es manuell eingeben.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('scanner');
                    startScanning();
                  }}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700"
                >
                  🔄 Nochmal scannen
                </button>
                <button
                  onClick={() => setStep('manual')}
                  className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-medium"
                >
                  ✏️ Manuell eingeben
                </button>
              </div>
            </div>
          )}

          {/* Manual Entry */}
          {step === 'manual' && (
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Produktname *
                  </label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="z.B. Müsliriegel"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Menge (g/ml)
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    placeholder="100"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kalorien *
                    </label>
                    <input
                      type="number"
                      value={manualCalories}
                      onChange={(e) => setManualCalories(e.target.value)}
                      placeholder="kcal"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={manualProtein}
                      onChange={(e) => setManualProtein(e.target.value)}
                      placeholder="g"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kohlenhydrate (g)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={manualCarbs}
                      onChange={(e) => setManualCarbs(e.target.value)}
                      placeholder="g"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fett (g)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={manualFat}
                      onChange={(e) => setManualFat(e.target.value)}
                      placeholder="g"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleAddManual}
                disabled={!manualName || !manualCalories}
                className="w-full mt-6 py-4 bg-teal-600 text-white rounded-xl font-semibold text-lg hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                ➕ Hinzufügen
              </button>
              
              <button
                onClick={() => {
                  setStep('scanner');
                  startScanning();
                }}
                className="w-full mt-3 py-3 text-gray-600 font-medium"
              >
                📷 Zurück zum Scanner
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSS for scanner animation */}
      <style jsx global>{`
        @keyframes scan-line {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(240px); }
        }
        
        body.barcode-scanner-active {
          background: transparent !important;
        }
        
        body.barcode-scanner-active .scanner-hidden {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
