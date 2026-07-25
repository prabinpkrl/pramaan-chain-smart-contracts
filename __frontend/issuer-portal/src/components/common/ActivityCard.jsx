import { useEffect, useState } from "react";
import { getRecentEvents } from "../../services/certificateService";

function ActivityCard() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await getRecentEvents();
        setEvents(data.events || []);
      } catch (err) {
        console.error(err);
      }
    };

    loadEvents();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>

      {events.length === 0 ? (
        <p className="text-gray-500">No recent blockchain activity.</p>
      ) : (
        <div className="space-y-4">
          {events.map((event, index) => (
            <div
              key={`${event.transactionHash}-${index}`}
              className="border-b pb-3 last:border-b-0"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold capitalize">{event.type}</p>

                  <p className="text-xs text-gray-500 font-mono">
                    {event.documentHash
                      ? event.documentHash.slice(0, 18) + "..."
                      : event.issuer?.slice(0, 18) + "..."}
                  </p>
                </div>

                <p className="text-xs text-gray-400">
                  {new Date(event.timestamp * 1000).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ActivityCard;
