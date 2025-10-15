// RSC shell for Producer Canvas
import ProducerCanvas from '@/app/(producer)/canvas/ProducerCanvas.client';
// Canvas data is loaded client-side for now
export default function ProducerCanvasPage() {
  // In a real app we would make this async and fetch server-side. For dev, we render the container and let client mount.
  return (
    <div className="h-screen w-full bg-gray-100">
      <div className="h-full w-full relative">
        {/* Client component will be loaded here */}
        <div
          data-canvas-container="react-flow"
          className="h-full w-full"
          style={{ backgroundColor: '#f9fafb' }}
        />

        {/* Mount client-side canvas logic */}
        <ProducerCanvas />

        {/* Debug info */}
        <div className="absolute top-2 left-2 bg-yellow-200 p-2 rounded text-xs z-50">
          Debug: Canvas page loaded
        </div>
      </div>
    </div>
  );
}
