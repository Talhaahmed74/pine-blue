const WhyChooseSection = () => {
  return (
    <section className="py-24 bg-white who-bg">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 leading-tight">
              Why Choose Pine Blue?
            </h2>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              Pine Blue isn't just a destination—it's an experience that goes beyond expectations. Nestled in the breathtaking hills of Murree, Pakistan's most beloved hill station, we combine luxury with the warmth of home to create memories that last a lifetime. Our commitment to exceptional service, combined with our stunning mountain location and thoughtfully designed spaces, makes Pine Blue the perfect choice for those seeking both adventure and tranquility.
            </p>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              Whether you're here for a romantic getaway, a family vacation, or a peaceful retreat from the bustling cities of Pakistan, Pine Blue offers everything you need to disconnect from the everyday and reconnect with what truly matters in the serene beauty of Murree's pine-covered hills.
            </p>
          </div>
          
          {/* Image */}
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=400&fit=crop" 
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