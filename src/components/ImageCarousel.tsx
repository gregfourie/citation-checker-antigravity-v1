import { useState, useEffect } from 'react';

const images = [
  '/screenshots/890DEEF0-64FA-477A-9DBA-09DF5C710594.png',
  '/screenshots/03BC2C74-37CD-46C7-8EBE-9ED02A5E430B_1_201_a.jpeg',
  '/screenshots/10D2234C-331C-47A3-BC26-811B6742FC97_1_201_a.jpeg',
  '/screenshots/1A1B80FF-3BE9-46D6-89BA-2C32DFB8CFF2_1_201_a.jpeg',
  '/screenshots/3ACD73F2-98A5-4769-B53A-4D8223089399_1_201_a.jpeg',
  '/screenshots/41978F41-6B9A-45DA-A6D5-B14813C39A69_1_201_a.jpeg',
  '/screenshots/4FA51F7A-C8B1-4ECB-848D-81799592AE29_1_201_a.jpeg',
  '/screenshots/6624FBB5-0D00-476D-BA7A-449ABB9D8DFC_1_201_a.jpeg',
  '/screenshots/82C55201-2252-4D4B-8265-E72043877B31_1_201_a.jpeg',
  '/screenshots/86FB28A4-08F4-43BD-9A06-87AD66729A07_1_201_a.jpeg',
  '/screenshots/A5CAC1A1-1BAA-4283-9DE9-423EEB73533E_1_201_a.jpeg',
  '/screenshots/ABC6AB31-08FF-4B37-85A0-99C2360B5096_1_201_a.jpeg',
  '/screenshots/DEF4CE0F-19B9-4A5C-B0A0-861EE289DD84_1_201_a.jpeg',
  '/screenshots/FD2AB32F-A3EF-476B-85F8-8A8E9B3DD01A_1_201_a.jpeg',
  '/screenshots/FE95D489-C64F-436A-BCB4-A6E1025DB7A8_1_201_a.jpeg'
];

export default function ImageCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      width: '100%',
      maxWidth: '600px',
      aspectRatio: '16/9',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '8px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
      backgroundColor: '#f5f5f5',
      margin: '40px auto 0'
    }}>
      {images.map((src, idx) => (
        <img
          key={idx}
          src={src}
          alt={`Screenshot showcase ${idx + 1}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: idx === currentIndex ? 1 : 0,
            transform: idx === currentIndex ? 'scale(1)' : 'scale(1.05)',
            transition: 'opacity 1.2s ease-in-out, transform 1.2s ease-in-out',
          }}
        />
      ))}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: '8px'
      }}>
        {images.map((_, idx) => (
          <div
            key={idx}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: idx === currentIndex ? 'var(--rust)' : 'rgba(0,0,0,0.2)',
              transition: 'background-color 0.4s'
            }}
          />
        ))}
      </div>
    </div>
  );
}
