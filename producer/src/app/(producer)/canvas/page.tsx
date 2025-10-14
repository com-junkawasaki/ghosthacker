// RSC shell for Producer Canvas
export default function ProducerCanvasPage() {
  return (
    <div className="h-screen w-full bg-gray-100">
      <div className="h-full w-full relative">
        {/* Client component will be loaded here */}
        <div
          id="react-flow-container"
          className="h-full w-full"
          style={{ backgroundColor: '#f9fafb' }}
        />
      </div>
    </div>
  );
}
