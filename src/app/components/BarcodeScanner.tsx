import { useState, useEffect } from 'react';
import { X, Scan, Keyboard, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const [manualEntry, setManualEntry] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [scanSuccess, setScanSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setManualEntry(false);
      setBarcodeInput('');
      setIsScanning(true);
      setScanSuccess(false);
    }
  }, [isOpen]);

  // Dev-only demo scan — disabled in production builds
  useEffect(() => {
    if (!import.meta.env.DEV || !isOpen || !isScanning || manualEntry) return;
    const timer = setTimeout(() => {
      simulateScan();
    }, 2000);
    return () => clearTimeout(timer);
  }, [isOpen, isScanning, manualEntry]);

  const simulateScan = () => {
    // Simulate scanning a random product SKU
    const skus = ['DF001', 'CF001', 'DT001', 'CT001', 'GR001', 'PH001', 'AC001'];
    const randomSku = skus[Math.floor(Math.random() * skus.length)];
    
    setScanSuccess(true);
    setIsScanning(false);
    
    setTimeout(() => {
      onScan(randomSku);
      setScanSuccess(false);
      setIsScanning(true);
    }, 800);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      onScan(barcodeInput.trim().toUpperCase());
      setBarcodeInput('');
      setManualEntry(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="bg-[#7BA886] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scan className="w-6 h-6" />
          <h2 className="text-xl font-semibold">
            {manualEntry ? 'Manual Entry' : 'Scan Barcode'}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner View */}
      {!manualEntry ? (
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {/* Viewfinder Overlay */}
          <div className="relative w-72 h-48">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white"></div>
            
            {/* Scanning Line */}
            {isScanning && !scanSuccess && (
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <div className="w-full h-1 bg-[#7BA886] animate-pulse shadow-lg shadow-[#7BA886]/50"></div>
              </div>
            )}
            
            {/* Success Indicator */}
            {scanSuccess && (
              <div className="absolute inset-0 bg-[#7BA886]/30 flex items-center justify-center animate-in fade-in zoom-in duration-300">
                <div className="bg-[#7BA886] rounded-full p-4">
                  <CheckCircle2 className="w-16 h-16 text-white" />
                </div>
              </div>
            )}
          </div>

          <p className="text-white mt-8 text-center px-8">
            {isScanning && !scanSuccess && 'Position barcode within the frame'}
            {scanSuccess && 'Item scanned successfully!'}
          </p>

          {/* Action Buttons */}
          <div className="absolute bottom-8 left-0 right-0 px-4 space-y-3">
            <Button
              onClick={() => setManualEntry(true)}
              variant="outline"
              className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 h-14 text-lg backdrop-blur-sm"
            >
              <Keyboard className="w-5 h-5 mr-2" />
              Enter SKU Manually
            </Button>
          </div>
        </div>
      ) : (
        // Manual Entry View
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <form onSubmit={handleManualSubmit} className="w-full max-w-md space-y-6">
            <div>
              <label htmlFor="sku" className="block text-white mb-3 text-lg">
                Enter Product SKU or Barcode:
              </label>
              <Input
                id="sku"
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="e.g., DF001, CF001"
                className="w-full h-14 text-lg text-center bg-white"
                autoFocus
              />
            </div>
            
            <div className="space-y-3">
              <Button
                type="submit"
                disabled={!barcodeInput.trim()}
                className="w-full bg-[#7BA886] hover:bg-[#5A8A6B] text-white h-14 text-lg"
              >
                Add to Cart
              </Button>
              <Button
                type="button"
                onClick={() => setManualEntry(false)}
                variant="outline"
                className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 h-14 text-lg"
              >
                Back to Scanner
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
