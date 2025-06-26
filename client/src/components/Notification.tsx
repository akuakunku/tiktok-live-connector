import './Notification.css';

const Notification = ({ message }: { message: string }) => {
  return <div className="notification">{message}</div>;
};

export default Notification;
