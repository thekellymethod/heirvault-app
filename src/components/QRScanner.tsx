"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<"prompt" | "granted" | "denied">("prompt");
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      setScanning(true);

      // Check if browser supports camera access
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported in this browser");
      }

      // Check if we're on HTTPS or localhost (required for camera access)
      const isSecureContext = window.isSecureContext || location.protocol === "https:" || location.hostname === "localhost";
      if (!isSecureContext) {
        throw new Error("Camera access requires a secure connection (HTTPS). Please use HTTPS or localhost.");
      }

      // Check existing permissions (if supported)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: "camera" as PermissionName });
          if (permissionStatus.state === "denied") {
            setError("Camera permission denied. Please allow camera access in your browser settings.");
            setPermissionStatus("denied");
            setScanning(false);
            return;
          }
        } catch (permError) {
          // Permission query not supported or failed, continue with getUserMedia
        }
      }

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      setPermissionStatus("granted");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        // Start QR code scanning
        startQRScanning();
      }
    } catch (err: any) {
      setScanning(false);
      
      // Handle specific error types with user-friendly messages
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        // Suppress console error for expected permission denials
        // Only log if in development mode for debugging
        if (process.env.NODE_ENV === "development") {
          console.warn("Camera permission denied by user");
        }
        setError("Camera permission denied. Please allow camera access in your browser settings.");
        setPermissionStatus("denied");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        console.error("Camera not found:", err);
        setError("No camera found. Please ensure your device has a camera.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        console.error("Camera in use:", err);
        setError("Camera is already in use by another application.");
      } else {
        // Log unexpected errors for debugging
        console.error("Unexpected camera error:", err);
        setError(err.message || "Failed to access camera. Please try again.");
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const startQRScanning = async () => {
    // Dynamically import jsQR to avoid SSR issues
    let jsQR: any;
    try {
      const jsQRModule = await import("jsqr");
      jsQR = jsQRModule.default || jsQRModule;
    } catch (err) {
      console.error("Failed to load jsQR:", err);
      setError("QR scanning library failed to load. Please refresh the page.");
      return;
    }
    
    // Use canvas to capture frames and decode QR codes
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context || !videoRef.current) return;

    scanIntervalRef.current = setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        return;
      }

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // Get image data from canvas
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Try to decode QR code using jsQR
      try {
        if (jsQR && typeof jsQR === "function") {
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code && code.data) {
            stopCamera();
            onScan(code.data);
          }
        }
      } catch (err) {
        // Continue scanning - errors are expected during normal operation
      }
    }, 300); // Scan every 300ms
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-ink-900">Scan QR Code</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-paper-100 rounded-full transition-colors"
            aria-label="Close scanner"
          >
            <X className="h-5 w-5 text-slateui-600" />
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="relative bg-black rounded-lg overflow-hidden aspect-square">
          {!scanning ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
              <Camera className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm text-center mb-4">
                Click the button below to start scanning
              </p>
              <Button onClick={startCamera} className="btn-primary">
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {/* Scanning overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-black/50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-gold-500 rounded-lg" />
                </div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-full inline-block">
                  Position QR code within the frame
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3">
          {scanning && (
            <Button onClick={stopCamera} className="btn-secondary flex-1">
              Stop Camera
            </Button>
          )}
          <Button onClick={handleClose} className="btn-secondary flex-1">
            Cancel
          </Button>
        </div>

        {permissionStatus === "denied" && (
          <div className="text-xs text-slateui-600 space-y-1">
            <p className="font-semibold">Camera permission denied</p>
            <p>
              To enable camera access:
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Click the camera icon in your browser&apos;s address bar</li>
              <li>Select &quot;Allow&quot; for camera access</li>
              <li>Refresh the page and try again</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

