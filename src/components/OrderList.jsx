function OrderList({ orders, selectedOrderId, setSelectedOrderId, t }) {
  const renderOrderStatus = (statusCode) => {
    return t.orderStatus[statusCode] ?? statusCode;
  };

  return (
    <div className="panel order-list">
      <h2>{t.orderListTitle}</h2>
      <ul>
        {orders.map((order) => (
          <li
            key={order.id}
            className={order.id === selectedOrderId ? 'selected' : ''}
            onClick={() => setSelectedOrderId(order.id)}
          >
            <div>#{order.id} — {order.passengerName}</div>
            <div className="small">
              {order.pickupAddress} → {order.dropoffAddress}
            </div>
            <div className="small">
              {t.status}：{renderOrderStatus(order.status)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default OrderList;
