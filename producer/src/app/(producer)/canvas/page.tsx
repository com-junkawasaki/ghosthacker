// RSC shell for Producer Canvas
import { ProducerCanvas } from "./ProducerCanvas.client";

// Merkledag: 5b6d7c8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c
export default async function ProducerPage() {
	return (
		<main className="h-screen w-screen overflow-hidden">
			<ProducerCanvas />
		</main>
	);
}
