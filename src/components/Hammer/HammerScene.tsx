import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import { useRef, useState, useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLoading } from "../../context/LoadingProvider";
import { setProgress } from "../Loading";
import { setAllTimeline, setPageScrollAnimations } from "../utils/GsapScroll";

gsap.registerPlugin(ScrollTrigger);

const Lightning = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Create pool of bolts using TubeGeometry for thickness
  const bolts = useMemo(() => {
    return new Array(5).fill(0).map(() => {
      // Random points for each bolt
      const points = [];
      const segments = 8;
      let x = 0, y = 1.2, z = 0; 
      
      points.push(new THREE.Vector3(x, y, z));
      for(let i=0; i<segments; i++) {
        x += (Math.random() - 0.5) * 1.5;
        y += (Math.random() - 0.2) * 1.5; 
        z += (Math.random() - 0.5) * 1.5;
        points.push(new THREE.Vector3(x, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      return new THREE.TubeGeometry(curve, 8, 0.02, 4, false);
    });
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    
    // Flicker effect
    groupRef.current.children.forEach((mesh) => {
      if (mesh instanceof THREE.Mesh) {
        if (Math.random() > 0.94) {
          mesh.visible = true;
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.8 + Math.random() * 0.2;
          
          mesh.rotation.set(
              Math.random() * 0.5,
              Math.random() * Math.PI * 2,
              Math.random() * 0.5
          );
          mesh.scale.setScalar(0.8 + Math.random() * 0.4);
        } else {
          mesh.visible = false;
        }
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {bolts.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshBasicMaterial 
            color="#aaddff" 
            transparent 
            opacity={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

// Helper component to handle camera setup
const SceneSetup = () => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
};

function HammerModel() {
  const { scene } = useGLTF("/models/hammer.glb");
  const meshRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const isMobile = viewport.width < 5; 

  // Setup materials
  useLayoutEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        
        // Hide the hammer head (flat platform) - geometric cubes
        if (mesh.name.includes("Cube")) {
           mesh.visible = false;
           return; 
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        const oldMat = mesh.material as THREE.MeshStandardMaterial;
        mesh.material = new THREE.MeshStandardMaterial({
          map: oldMat.map,
          normalMap: oldMat.normalMap,
          roughnessMap: oldMat.roughnessMap,
          metalnessMap: oldMat.metalnessMap,
          color: oldMat.color,
          roughness: 0.4,
          metalness: 0.8,
          emissive: new THREE.Color("#2244ff"), 
          emissiveIntensity: 0.15, // Reduced from 0.3
          transparent: true,
          opacity: 1,
        });
      }
    });
  }, [scene]);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      // Idle animation
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  // Scroll Animation
  useEffect(() => {
    const el = meshRef.current;
    if (!el) return;

    const trigger = ScrollTrigger.create({
      trigger: ".landing-section",
      start: "top top",
      end: "bottom top", 
      scrub: 1, // Smooth scrub
      onUpdate: (self) => {
        // Move down more aggressively to "dock" or exit
        const startY = isMobile ? -0.5 : 0;
        const progress = self.progress;
        
        el.position.y = startY - progress * 8; // Move down further
        
        // Scale down slightly as it moves away
        const baseScale = isMobile ? 0.7 : 1.2;
        const targetScale = baseScale * (1 - progress * 0.3);
        el.scale.setScalar(targetScale);

        // Opacity fade out
        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            // Keep hammer head hidden
            if (child.name.includes("Cube")) return;

            const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
            // Fade out faster in the second half of scroll
            mat.opacity = Math.max(0, 1 - progress * 1.5); 
            child.visible = mat.opacity > 0;
          }
        });
      },
    });

    return () => {
      trigger.kill();
    };
  }, [scene, isMobile]);

  // Positioning: 
  const position: [number, number, number] = [0, isMobile ? -0.5 : 0, 0];
  const scale = isMobile ? 0.7 : 1.2; // Increased desktop scale

  return (
    <group ref={meshRef} position={position} scale={scale} rotation={[0.2, -0.5, 0]}>
      <primitive object={scene} />
      <Lightning />
    </group>
  );
}

const HammerScene = () => {
  const { setLoading } = useLoading();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let progress = setProgress((value) => setLoading(value));
    progress.loaded();
    
    const workTrigger = ScrollTrigger.getById("work");
    ScrollTrigger.getAll().forEach((trigger) => {
      if (trigger !== workTrigger) {
        trigger.kill();
      }
    });

    setAllTimeline();
    setPageScrollAnimations();

    return () => {
      progress.clear();
    };
  }, [setLoading]);

  return (
    <div className="hammer-scene-container" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100vh',
      zIndex: isMobile ? 1 : 11, 
      pointerEvents: 'none',
      overflow: 'visible'
    }}>
      <Canvas
        camera={{ position: [0, 0.5, 4], fov: 45 }}
        style={{ pointerEvents: 'auto' }}
        gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        shadows
      >
        <SceneSetup />
        
        {/* Environment for Reflections */}
        <Environment 
          files="/models/char_enviorment.hdr" 
          environmentIntensity={1}
          blur={0.5} 
        />

        {/* Three-Point Lighting Setup */}
        {/* Key Light: Strongest, from front-right */}
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[1024, 1024]} 
        />
        
        {/* Fill Light: Weaker, from opposite side (left) to soften shadows */}
        <pointLight 
          position={[-5, 0, 5]} 
          intensity={0.5} 
          color="#eef" // Slightly cool fill
        />
        
        {/* Rim Light: From behind/top to outline the shape */}
        <spotLight 
          position={[0, 5, -5]} 
          intensity={3} 
          angle={0.5} 
          penumbra={1} 
          color="#fff"
        />

        {/* Local "Charged" Effect Light */}
        <pointLight 
          position={[0, 1, 0]} 
          color="#4488ff" 
          intensity={2} 
          distance={5} 
          decay={2} 
        />
        
        <HammerModel />
      </Canvas>
    </div>
  );
};

export default HammerScene;
