import React from 'react';

const About = () => {
  const containerStyle = {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px',
    background: '#18181b',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    textAlign: 'center'
  };

  const socialBtnStyle = {
    display: 'inline-block',
    margin: '10px',
    padding: '10px 20px',
    background: '#27272a',
    color: '#fff',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  };

  return (
    <div style={containerStyle}>
      <img
        src="/"
        alt={process.env.REACT_APP_ORGANIZATION_NAME} 
        style={{ width: '180px', height: '180px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f97316', marginBottom: '20px', boxShadow: '0 4px 20px rgba(249, 115, 22, 0.4)' }}
      />
      <h2 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#fff' }}>About Us</h2>

   <div style={{ color: '#a1a1aa', fontSize: '1.2rem', lineHeight: '1.8', maxWidth: '600px', margin: '0 auto 30px auto' }}>

  <p>
    {process.env.REACT_APP_ORGANIZATION_NAME} is a modern e-commerce platform built to make online shopping simple, fast, and reliable. We bring together a wide variety of products including electronics, fashion, books, beauty, and lifestyle essentials in one place.
  </p>

  <p>
    Our goal is to provide users with a smooth and enjoyable shopping experience through easy navigation, smart search, and well-organized product categories.
  </p>

  <p><strong>At {process.env.REACT_APP_ORGANIZATION_NAME}, we focus on:</strong></p>

  <ul style={{ textAlign: 'left', margin: '10px auto', maxWidth: '500px' }}>
    <li>Quality products at affordable prices</li>
    <li>Fast and user-friendly shopping experience</li>
    <li>Secure and trusted transactions</li>
    <li>Customer satisfaction as our top priority</li>
  </ul>

  <p>
    We are constantly improving our platform to make online shopping more convenient and personalized for every user.
  </p>

</div>

  
    </div>
  );
};

export default About;
