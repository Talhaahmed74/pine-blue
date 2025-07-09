import { Button } from "@/components/ui/button";

const MountainSection = () => {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Images */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <img 
                src="https://images.unsplash.com/photo-1472396961693-142e6e269027?w=300&h=400&fit=crop"
                alt="Mountain view of Murree"
                className="w-full h-80 object-cover rounded-lg shadow-lg"
              />
            </div>
            <div className="space-y-4">
              <img 
                src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&h=180&fit=crop"
                alt="Murree landscape"
                className="w-full h-36 object-cover rounded-lg shadow-lg"
              />
              <img 
                src="https://images.unsplash.com/photo-1615729947596-a598e5de0ab3?w=300&h=180&fit=crop"
                alt="Pine forest view in Murree"
                className="w-full h-40 object-cover rounded-lg shadow-lg"
              />
            </div>
          </div>
          
          {/* Content */}
          <div className="space-y-8">
            <div>
              <div className="text-primary font-bold uppercase tracking-wide text-sm mb-2">MURREE HILLS</div>
              <h2 className="text-4xl font-light text-gray-900 mb-4">Mountain Views</h2>
            </div>
            
            <div className="space-y-6">
              <p className="text-gray-600 leading-relaxed">
                <strong>Wake up to breathtaking views of Murree's majestic hills</strong> that stretch as far as the eye can see. Our prime location in Pakistan's premier hill station offers unobstructed views of pine-covered mountains, rolling green hills, and pristine wilderness that changes with the seasons.
              </p>
              
              <p className="text-gray-600 leading-relaxed">
                From sunrise to sunset, watch as Murree's mountains transform with changing light, creating a natural spectacle that never gets old. Whether you're enjoying your morning chai or evening tea, these panoramic views of Pakistan's beloved hill station provide the perfect backdrop for unforgettable moments.
              </p>
            </div>
            
            <Button className="bg-primary hover:bg-primary/90 text-white px-8 py-3">
              Explore More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MountainSection;