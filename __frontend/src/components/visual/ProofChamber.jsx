import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";

const DEFAULT_DIGEST = "8b7cf6a99df8292d35a113181b212624090a0d71717af4f4f560a5fa34d399";

function ChamberCore({ digest }) {
  const group = useRef(null);
  const scan = useRef(null);
  const cells = useRef(null);
  const plateEdges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(2.7, 3.45, 0.08)),
    [],
  );
  const values = useMemo(
    () => (digest || DEFAULT_DIGEST).replace(/^0x/, "").padEnd(64, "0").slice(0, 64),
    [digest],
  );

  useEffect(() => {
    if (!cells.current) return;
    const object = new THREE.Object3D();
    const color = new THREE.Color();

    [...values].forEach((value, index) => {
      const angle = (Math.PI * 2 * index) / 64;
      const outer = index % 2 === 0;
      object.position.set(
        Math.cos(angle) * (outer ? 3.45 : 3.15),
        Math.sin(angle) * (outer ? 2.08 : 1.9),
        Math.sin(angle * 3) * 0.16,
      );
      object.rotation.set(0, 0, angle);
      const strength = Number.parseInt(value, 16) / 15;
      object.scale.set(0.65 + strength * 0.6, 0.65 + strength * 0.6, 1);
      object.updateMatrix();
      cells.current.setMatrixAt(index, object.matrix);
      color.set(strength > 0.58 ? "#a99df8" : "#554b9c");
      cells.current.setColorAt(index, color);
    });

    cells.current.instanceMatrix.needsUpdate = true;
    if (cells.current.instanceColor) cells.current.instanceColor.needsUpdate = true;
  }, [values]);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.035;
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      state.pointer.y * 0.055,
      0.04,
    );
    group.current.rotation.z = THREE.MathUtils.lerp(
      group.current.rotation.z,
      -state.pointer.x * 0.045,
      0.04,
    );
    if (scan.current) {
      scan.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 1.45;
    }
  });

  return (
    <group ref={group} rotation={[0.04, -0.08, 0]}>
      <mesh>
        <boxGeometry args={[2.7, 3.45, 0.08]} />
        <meshStandardMaterial color="#111318" roughness={0.72} metalness={0.28} />
      </mesh>
      <lineSegments geometry={plateEdges}>
        <lineBasicMaterial color="#71717a" transparent opacity={0.72} />
      </lineSegments>

      {[-0.88, -0.53, -0.18].map((position, index) => (
        <mesh key={position} position={[-0.25 + index * 0.08, position, 0.07]}>
          <boxGeometry args={[1.45 - index * 0.18, 0.025, 0.02]} />
          <meshBasicMaterial color="#71717a" transparent opacity={0.75} />
        </mesh>
      ))}

      <mesh position={[0.62, 0.7, 0.2]} scale={[0.78, 1.04, 0.78]}>
        <octahedronGeometry args={[0.62, 0]} />
        <meshStandardMaterial color="#181b21" roughness={0.36} metalness={0.78} />
      </mesh>
      <mesh position={[0.62, 0.7, 0.205]} scale={[0.79, 1.05, 0.79]}>
        <octahedronGeometry args={[0.62, 0]} />
        <meshBasicMaterial color="#a99df8" wireframe transparent opacity={0.94} />
      </mesh>

      <instancedMesh ref={cells} args={[null, null, 64]}>
        <boxGeometry args={[0.09, 0.19, 0.07]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      <mesh ref={scan} position={[0, 0, 0.15]}>
        <boxGeometry args={[3.25, 0.025, 0.02]} />
        <meshBasicMaterial color="#8b7cf6" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function ProofChamber({ digest = "" }) {
  return (
    <div className="h-full min-h-[420px] w-full" data-testid="proof-chamber">
      <Canvas
        camera={{ position: [0, 0, 7.8], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={1.9} />
        <directionalLight position={[4, 6, 6]} color="#d9d5ff" intensity={2.2} />
        <directionalLight position={[-4, -2, 4]} color="#6256b5" intensity={1.1} />
        <ChamberCore digest={digest} />
      </Canvas>
    </div>
  );
}

export default ProofChamber;
