const StarRating = ({ rating, numReviews, size = 14 }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {stars.map(star => (
        <span key={star} style={{
          fontSize:  size,
          color:     star <= Math.round(rating) ? '#f97316' : '#3f3f46',
        }}>
          ★
        </span>
      ))}
      {numReviews !== undefined && (
        <span style={{ fontSize: size - 2, color: '#71717a', marginLeft: 4 }}>
          ({numReviews})
        </span>
      )}
    </div>
  );
};

export default StarRating;