import React, { useEffect, useState } from "react";

// Layer image paths
import Bg from "/lovable-uploads/bg.png";
import Layer1 from "/lovable-uploads/layer1.png";
import Layer2 from "/lovable-uploads/layer2.png";
import Layer3 from "/lovable-uploads/layer3.png";
import Layer4 from "/lovable-uploads/layer4.png";
import Layer5 from "/lovable-uploads/layer5.png";

const HeroSection: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="w-full h-screen relative overflow-hidden bg-gradient-to-b from-[#cfd7e6] to-white">
      <div className="sticky top-0 w-full h-screen overflow-hidden">

        {/* Background Layer */}
        <img
          src={Bg}
          alt="bg"
          className="absolute top-0 left-0 w-full h-full object-cover z-10"
          style={{ transform: `translateY(-${scrollY * 0.05}px)` }}
        />

        {/* Layer 1 */}
        <img
          src={Layer1}
          alt="layer1"
          className="absolute top-0 left-0 w-[100vw] h-[100vh] object-cover z-XX"
          style={{ transform: `translateY(-${scrollY * 0.08}px)` }}
        />

        {/* Layer 2 */}
        <img
          src={Layer2}
          alt="layer2"
          className="absolute top-0 left-0 w-full h-full object-contain z-30"
          style={{ transform: `translateY(-${scrollY * 0.12}px)` }}
        />

        {/* Layer 3 */}
        <img
          src={Layer3}
          alt="layer3"
          className="absolute top-0 left-0 w-full h-full object-contain z-40"
          style={{ transform: `translateY(-${scrollY * 0.18}px)` }}
        />

        {/* Layer 4 */}
        <img
          src={Layer4}
          alt="layer4"
          className="absolute top-0 left-0 w-full h-full object-contain z-50"
          style={{ transform: `translateY(-${scrollY * 0.25}px)` }}
        />

        {/* Layer 5 */}
          <img
    src={Layer5}
    alt="layer5"
    className="absolute top-0 left-0 w-full h-full object-contain z-[100]"
    style={{
      transform: `translateY(${-scrollY * 0.42}px)`,
      
    }}
  />


        {/* Content */}
        <div className="relative z-[70] h-full flex items-center justify-center text-center px-6">
          <div>
            <h1 className="text-5xl md:text-7xl font-bold text-white drop-shadow-lg">
              A Breath of Fresh Air
            </h1>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
