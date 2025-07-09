const WhyChooseSection = () => {
  return (
    <section className="py-24 bg-white who-bg">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 leading-tight">
              Why Choose Blue Pine Resort?
            </h2>
            
            <p className="text-xl text-gray-600 mb-12 animate-fade-in-up max-w-2xl mx-auto" style={{animationDelay: '0.2s'}}>
            Nestled in the heart of Murree's majestic hills, Blue Pine Resort offers a tranquil escape that feels like coming home. Experience the beauty of Pakistan's premier hill station with breathtaking mountain views.
          </p>
          </div>
          
          {/* Image */}
          <div className="relative">
            <img 
              src="/lovable-uploads/whychoose.jpg" 
              alt="Beautiful mountain landscape of Murree with pine trees" 
              className="w-full h-96 object-cover rounded-lg shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseSection;