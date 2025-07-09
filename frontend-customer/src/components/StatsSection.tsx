const StatsSection = () => {
  const stats = [
    {
      number: "20+",
      label: "Various Services"
    },
    {
      number: "150+",
      label: "Satisfied Rooms"
    },
    {
      number: "15+",
      label: "Experience"
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <h3 className="text-5xl font-bold text-primary mb-2">{stat.number}</h3>
              <p className="text-gray-600 font-medium uppercase tracking-wide text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;