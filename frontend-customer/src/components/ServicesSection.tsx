import { Building, Key, Car } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

const ServicesSection = () => {
  const services = [
    
    {
      icon: Key,
      title: "BEST ROOMS",
      subtitle: "Cool View",
      images: [
        "/lovable-uploads/room5.jpg",
        "/lovable-uploads/room4.jpg",
        "/lovable-uploads/room6.jpg",
        "/lovable-uploads/room4.jpg"
      ]
    },
  
  ];

  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="py-24 bg-white service-bg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-4xl font-light text-gray-900">Gellery</h2>
          <a href="#" className="text-primary font-medium flex items-center gap-1 text-sm">
            SEE MORE <span className="text-lg">→</span>
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mb-8 flex-wrap">
          {services.map((service, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={clsx(
                "flex items-center gap-3 px-4 py-2 rounded-md border transition-all duration-200",
                activeTab === index
                  ? "bg-green-100 border-green-300"
                  : "bg-white border-gray-200 hover:bg-gray-50"
              )}
            >
              <service.icon className="w-5 h-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold text-sm text-gray-800">{service.title}</div>
                <div className="text-xs text-gray-500">{service.subtitle}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Gallery Layout: Big left + 2 stacked right */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Big Image on Left (1st Image) */}
          <div className="md:col-span-2 h-full">
            <img
              src={services[activeTab].images[0]}
              alt="Main"
              className="w-full h-full object-cover rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
            />
          </div>

          {/* Stacked Images on Right (next 2) */}
          <div className="flex flex-col gap-4">
            <img
              src={services[activeTab].images[1]}
              alt="Sub 1"
              className="w-full h-1/2 object-cover rounded-lg shadow-md"
            />
            <img
              src={services[activeTab].images[2]}
              alt="Sub 2"
              className="w-full h-1/2 object-cover rounded-lg shadow-md"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
