import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";

function CrystalMesh() {
  const group = useRef(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.16;
    group.current.rotation.x = state.pointer.y * 0.18;
    group.current.rotation.z = -state.pointer.x * 0.12;
  });

  return (
    <group ref={group} rotation={[0.22, -0.4, 0.08]}>
      <mesh scale={[1.6, 2.15, 1.6]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#171923" roughness={0.38} metalness={0.72} />
      </mesh>
      <mesh scale={[1.612, 2.162, 1.612]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#8b7cf6" wireframe transparent opacity={0.88} />
      </mesh>
      <mesh position={[0, -0.05, 0]} scale={[0.65, 0.9, 0.65]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#a99df8" wireframe transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function ProofCrystal() {
  return (
    <div className="h-full min-h-[360px] w-full" data-testid="proof-crystal">
      <Canvas
        camera={{ position: [0, 0, 6.3], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={1.6} />
        <directionalLight position={[4, 6, 5]} color="#c4bcff" intensity={2.4} />
        <directionalLight position={[-4, -2, 3]} color="#737bff" intensity={1.1} />
        <CrystalMesh />
      </Canvas>
    </div>
  );
}

export default ProofCrystal;
