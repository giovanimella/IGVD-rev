import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BannerCarousel = () => {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }, 5000); // Troca a cada 5 segundos

      return () => clearInterval(interval);
    }
  }, [banners]);

  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/banners/`);
      setBanners(response.data);
    } catch (error) {
      console.error('Erro ao buscar banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  if (loading || banners.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden shadow-lg mb-6">
      {/* Imagem do Banner */}
      <img
        src={`${API_URL}${banners[currentIndex].image_url}`}
        alt={banners[currentIndex].title || 'Banner'}
        className="w-full h-full object-cover"
      />

      {/* Overlay com título se existir */}
      {banners[currentIndex].title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
          <h3 className="text-white text-2xl font-outfit font-bold">
            {banners[currentIndex].title}
          </h3>
        </div>
      )}

      {/* Botões de navegação */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
          >
            <ChevronLeft className="w-6 h-6 text-slate-900" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
          >
            <ChevronRight className="w-6 h-6 text-slate-900" />
          </button>

          {/* Indicadores */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-white w-8' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default BannerCarousel;