import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";

function VaultMesh() {
  const assembly = useRef(null);
  const outerRing = useRef(null);
  const innerRing = useRef(null);

  useFrame((state, delta) => {
    if (!assembly.current) return;

    assembly.current.rotation.y += delta * 0.11;
    assembly.current.rotation.x += (
      state.pointer.y * 0.14 - assembly.current.rotation.x
    ) * 0.035;
    assembly.current.rotation.z += (
      -state.pointer.x * 0.1 - assembly.current.rotation.z
    ) * 0.035;

    if (outerRing.current) outerRing.current.rotation.z -= delta * 0.08;
    if (innerRing.current) innerRing.current.rotation.x += delta * 0.07;
  });

  return (
    <group ref={assembly} rotation={[0.14, -0.32, -0.08]}>
      <mesh scale={1.22}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#111318"
          metalness={0.78}
          roughness={0.3}
        />
      </mesh>

      <mesh scale={1.235}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#8b7cf6"
          wireframe
          transparent
          opacity={0.72}
        />
      </mesh>

      <mesh ref={outerRing} rotation={[Math.PI / 2.6, 0.18, 0]} scale={1.05}>
        <torusGeometry args={[1.85, 0.018, 8, 128]} />
        <meshBasicMaterial color="#a99df8" transparent opacity={0.86} />
      </mesh>

      <mesh ref={innerRing} rotation={[0.12, Math.PI / 2.3, 0.42]}>
        <torusGeometry args={[1.55, 0.014, 8, 112]} />
        <meshBasicMaterial color="#646176" transparent opacity={0.85} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0.54, Math.PI / 2]}>
        <torusGeometry args={[2.13, 0.01, 8, 128]} />
        <meshBasicMaterial color="#343842" transparent opacity={0.9} />
      </mesh>

      {[
        [0, 1.84, 0],
        [-1.55, -1.04, 0.46],
        [1.56, -0.9, -0.42],
      ].map((position, index) => (
        <mesh key={position.join(":")} position={position} scale={index === 0 ? 0.14 : 0.11}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial
            color={index === 0 ? "#a99df8" : "#5f587e"}
            wireframe
          />
        </mesh>
      ))}
    </group>
  );
}

function SignatureVault() {
  return (
    <div className="h-full min-h-[360px] w-full" data-testid="signature-vault">
      <Canvas
        camera={{ position: [0, 0, 6.8], fov: 39 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={1.25} />
        <directionalLight position={[4, 5, 6]} color="#c4bcff" intensity={2.1} />
        <directionalLight position={[-4, -3, 2]} color="#555075" intensity={0.9} />
        <VaultMesh />
      </Canvas>
    </div>
  );
}

export default SignatureVault;
