import Canvas from "@/components/Canvas/Canvas";
import Inbox from "@/components/Inbox/Inbox";
import DragWrapper from "@/components/DragWrapper";
import ItemCard from "@/components/Grid/ItemCard";
import { MOCK_ITEMS } from "@/lib/mockData";

export default function Home() {
  return (
    <DragWrapper>
      <main>
        <Canvas>
          {MOCK_ITEMS.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
          <div style={{ position: 'absolute', left: 400, top: 400, color: 'white', pointerEvents: 'none', userSelect: 'none' }}>
            <h1>Welcome to Your Brain</h1>
            <p>Drag to pan, Scroll to zoom</p>
          </div>
        </Canvas>
        <Inbox />
      </main>
    </DragWrapper>
  );
}
