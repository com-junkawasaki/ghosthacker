// RSC shell for Producer Canvas
export default function ProducerCanvasPage() {
  return (
    <div className="h-screen w-full">
      <div className="h-full w-full">
        {/* Client component will be loaded here */}
        <div id="react-flow-container" className="h-full w-full" />
      </div>
    </div>
  );
}
