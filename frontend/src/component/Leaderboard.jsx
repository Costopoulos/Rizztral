import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { app } from '../firebaseConfig';

const db = getFirestore(app);

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const leaderboardRef = collection(db, 'leaderboard');
      const q = query(leaderboardRef, orderBy('score', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setLeaderboardData(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLoading(false);
    }
  };

  // Test function to add dummy data
  const addTestData = async () => {
    try {
      const testData = {
        playerName: `Player${Math.floor(Math.random() * 100)}`,
        score: Math.floor(Math.random() * 100),
        timestamp: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'leaderboard'), testData);
      fetchLeaderboard(); // Refresh the leaderboard
    } catch (error) {
      console.error('Error adding test data:', error);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Leaderboard</h2>
        <button
          onClick={addTestData}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Test Data
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <div className="space-y-2">
          {leaderboardData.map((entry, index) => (
            <div
              key={entry.id}
              className="flex justify-between items-center p-3 bg-gray-50 rounded"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg">{index + 1}.</span>
                <span>{entry.playerName}</span>
              </div>
              <span className="font-semibold">{entry.score}</span>
            </div>
          ))}
          {leaderboardData.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No scores yet
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;