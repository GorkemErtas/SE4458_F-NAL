import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '../styles/AppointmentBooking.css';

// Varsayılan koordinatlar (İzmir merkez)
const defaultCenter = { lat: 38.4192, lng: 27.1287 };

const customIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

const AppointmentBooking = () => {
    const { id } = useParams();
    const [doctorDetails, setDoctorDetails] = useState(null);
    const [coordinates, setCoordinates] = useState(defaultCenter);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [formError, setFormError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDoctorDetails = async () => {
            try {
                const response = await fetch(`http://localhost:5001/api/doctors/appointment/${id}`);
                if (!response.ok) {
                    throw new Error(response.status === 404 ? 'Doctor not found' : 'Failed to fetch doctor details');
                }
                const data = await response.json();
                setDoctorDetails(data);

                if (data.city) {
                    fetchCoordinates(data.city);
                }
            } catch (error) {
                console.error('Error fetching doctor details:', error);
                setErrorMessage(error.message);
            }
        };

        fetchDoctorDetails();
    }, [id]);

    const fetchCoordinates = async (city) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.length > 0) {
                setCoordinates({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
            } else {
                console.error("Geocoding API error: No results found");
            }
        } catch (error) {
            console.error("Error fetching coordinates:", error);
        } finally {
            setLoading(false);
        }
    };

    const validateAppointment = (date, time) => {
        if (!doctorDetails) return false;

        const selectedDay = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
        const selectedTime = time;

        const availableDays = doctorDetails.available_days || [];
        const startTime = doctorDetails.start_time;
        const endTime = doctorDetails.end_time;

        if (!availableDays.includes(selectedDay)) {
            setFormError(` The doctor is not available on ${selectedDay}.`);
            return false;
        }

        if (selectedTime < startTime || selectedTime > endTime) {
            setFormError(` The doctor is only available between ${startTime} - ${endTime}.`);
            return false;
        }

        setFormError('');
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const appointmentData = {
            name: formData.get('name'),
            email: formData.get('email'),
            date: formData.get('date'),
            time: formData.get('time'),
            doctorId: id,
        };

        if (!validateAppointment(appointmentData.date, appointmentData.time)) {
            return;
        }

        try {
            const response = await fetch('http://localhost:5001/api/appointments/book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(appointmentData),
            });

            if (response.ok) {
                alert('Appointment booked successfully!');
                navigate('/');
            } else {
                alert('Failed to book appointment. Please try again.');
            }
        } catch (error) {
            console.error('Error booking appointment:', error);
            alert('An error occurred. Please try again.');
        }
    };

    if (errorMessage) {
        return <p>{errorMessage}</p>;
    }

    if (!doctorDetails) {
        return null;
    }

    return (
        <div className="appointment-booking-container">
            <div className="doctor-info">
                <h1 className="doctor-name">{doctorDetails.fullname}</h1>
                <p><strong>Specialization:</strong> {doctorDetails.area_of_interest}</p>
                <p><strong>Address:</strong> {doctorDetails.address}</p>
                <p><strong>Available Days:</strong> {doctorDetails.available_days?.join(', ')}</p>
                <p><strong>Available Hours:</strong> {doctorDetails.start_time} - {doctorDetails.end_time}</p>
                <p><strong>City:</strong> {doctorDetails.city}</p>
                <p><strong>Country:</strong> {doctorDetails.country}</p>
            </div>

            <div className="map-and-form">
                <div className="leaflet-map">
                    {loading ? (
                        <p>Loading map...</p>
                    ) : (
                        <MapContainer center={coordinates} zoom={12} style={{ width: '100%', height: '300px' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            <Marker position={coordinates} icon={customIcon}>
                                <Popup>{doctorDetails.city}</Popup>
                            </Marker>
                        </MapContainer>
                    )}
                </div>

                <div className="booking-form">
                    <h2>Book an Appointment</h2>
                    {formError && <p className="error-message">{formError}</p>}
                    <form onSubmit={handleSubmit}>
                        <label>Your Name:</label>
                        <input type="text" name="name" required />
                        <label>Your Email:</label>
                        <input type="email" name="email" required />
                        <label>Date:</label>
                        <input type="date" name="date" required />
                        <label>Time:</label>
                        <input type="time" name="time" required />
                        <button type="submit">Book Appointment</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AppointmentBooking;
