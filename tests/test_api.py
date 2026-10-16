def test_home_endpoint(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["status"] == "running"


def test_create_product(client):
    product_data = {
        "name": "Test Wireless Mouse",
        "sku": "TEST-WM-001",
        "quantity": 10,
        "price": 1500.0,
    }

    response = client.post("/products/", json=product_data)

    assert response.status_code == 201

    data = response.json()
    assert data["name"] == "Test Wireless Mouse"
    assert data["sku"] == "TEST-WM-001"
    assert data["quantity"] == 10
    assert data["price"] == 1500.0
    assert "id" in data


def test_duplicate_sku_is_rejected(client):
    product_data = {
        "name": "First Mouse",
        "sku": "DUPLICATE-001",
        "quantity": 5,
        "price": 1000.0,
    }

    first_response = client.post("/products/", json=product_data)
    second_response = client.post("/products/", json=product_data)

    assert first_response.status_code == 201
    assert second_response.status_code == 409


def test_search_products_by_name(client):
    client.post(
        "/products/",
        json={
            "name": "Gaming Mouse",
            "sku": "TEST-GM-001",
            "quantity": 8,
            "price": 2000.0,
        },
    )

    response = client.get("/products/", params={"search": "Gaming"})

    assert response.status_code == 200
    products = response.json()

    assert len(products) == 1
    assert products[0]["name"] == "Gaming Mouse"


def test_search_products_by_sku(client):
    client.post(
        "/products/",
        json={
            "name": "USB Keyboard",
            "sku": "TEST-KB-002",
            "quantity": 12,
            "price": 2500.0,
        },
    )

    response = client.get(
        "/products/",
        params={"search": "TEST-KB-002"},
    )

    assert response.status_code == 200
    products = response.json()

    assert len(products) == 1
    assert products[0]["sku"] == "TEST-KB-002"


def test_product_pagination(client):
    for number in range(3):
        response = client.post(
            "/products/",
            json={
                "name": f"Test Product {number}",
                "sku": f"PAGE-{number:03}",
                "quantity": 10,
                "price": 100.0,
            },
        )
        assert response.status_code == 201

    response = client.get(
        "/products/",
        params={"skip": 0, "limit": 2},
    )

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_stock_increases_when_stock_is_received(client):
    product_response = client.post(
        "/products/",
        json={
            "name": "Stock Test Product",
            "sku": "STOCK-IN-001",
            "quantity": 5,
            "price": 100.0,
        },
    )
    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    movement_response = client.post(
        "/stock-movements/",
        json={
            "product_id": product_id,
            "movement_type": "stock_in",
            "quantity": 10,
            "reason": "Restock",
        },
    )
    assert movement_response.status_code == 201

    updated_product = client.get(f"/products/{product_id}")
    assert updated_product.status_code == 200
    assert updated_product.json()["quantity"] == 15


def test_stock_out_reduces_quantity(client):
    product_response = client.post(
        "/products/",
        json={
            "name": "Stock Out Test Product",
            "sku": "STOCK-OUT-001",
            "quantity": 10,
            "price": 100.0,
        },
    )
    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    movement_response = client.post(
        "/stock-movements/",
        json={
            "product_id": product_id,
            "movement_type": "stock_out",
            "quantity": 3,
            "reason": "Items sold",
        },
    )
    assert movement_response.status_code == 201

    updated_product = client.get(f"/products/{product_id}")
    assert updated_product.status_code == 200
    assert updated_product.json()["quantity"] == 7


def test_stock_out_rejects_insufficient_stock(client):
    product_response = client.post(
        "/products/",
        json={
            "name": "Limited Stock Product",
            "sku": "LIMITED-001",
            "quantity": 2,
            "price": 100.0,
        },
    )
    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    movement_response = client.post(
        "/stock-movements/",
        json={
            "product_id": product_id,
            "movement_type": "stock_out",
            "quantity": 5,
            "reason": "Items sold",
        },
    )

    assert movement_response.status_code == 400


def test_sale_reduces_stock_and_records_sale(client):
    product_response = client.post(
        "/products/",
        json={
            "name": "Sales Test Product",
            "sku": "SALE-TEST-001",
            "quantity": 10,
            "price": 250.0,
        },
    )
    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    sale_response = client.post(
        "/sales/",
        json={
            "product_id": product_id,
            "quantity": 3,
            "payment_method": "cash",
        },
    )

    assert sale_response.status_code == 201
    sale = sale_response.json()
    assert sale["quantity"] == 3
    assert sale["unit_price"] == 250.0
    assert sale["total_amount"] == 750.0

    product_after_sale = client.get(f"/products/{product_id}")
    assert product_after_sale.status_code == 200
    assert product_after_sale.json()["quantity"] == 7

    movements_response = client.get("/stock-movements/")
    assert movements_response.status_code == 200
    assert any(
        movement["product_id"] == product_id
        and movement["movement_type"] == "stock_out"
        and movement["quantity"] == 3
        for movement in movements_response.json()
    )


def test_sale_rejects_insufficient_stock(client):
    product_response = client.post(
        "/products/",
        json={
            "name": "Insufficient Stock Product",
            "sku": "SALE-TEST-002",
            "quantity": 1,
            "price": 100.0,
        },
    )
    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    sale_response = client.post(
        "/sales/",
        json={
            "product_id": product_id,
            "quantity": 5,
            "payment_method": "cash",
        },
    )

    assert sale_response.status_code == 400

    product_after_attempt = client.get(f"/products/{product_id}")
    assert product_after_attempt.json()["quantity"] == 1


def test_dashboard_summary(client):
    product_response = client.post(
        "/products/",
        json={
            "name": "Dashboard Test Product",
            "sku": "DASH-TEST-001",
            "quantity": 10,
            "price": 200.0,
        },
    )
    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    sale_response = client.post(
        "/sales/",
        json={
            "product_id": product_id,
            "quantity": 2,
            "payment_method": "cash",
        },
    )
    assert sale_response.status_code == 201

    summary_response = client.get("/dashboard/summary")
    assert summary_response.status_code == 200

    summary = summary_response.json()
    assert summary["total_products"] == 1
    assert summary["total_units_in_stock"] == 8
    assert summary["total_sales"] == 1
    assert summary["total_revenue"] == 400.0

def test_update_product(client):
    create_response = client.post(
        "/products/",
        json={
            "name": "Original Product",
            "sku": "UPDATE-001",
            "quantity": 10,
            "price": 100.0,
        },
    )

    assert create_response.status_code == 201
    product_id = create_response.json()["id"]

    update_response = client.patch(
        f"/products/{product_id}",
        json={
            "name": "Updated Product",
            "price": 150.0,
        },
    )

    assert update_response.status_code == 200

    updated_product = update_response.json()
    assert updated_product["name"] == "Updated Product"
    assert updated_product["price"] == 150.0
    assert updated_product["quantity"] == 10


def test_delete_product_without_history(client):
    create_response = client.post(
        "/products/",
        json={
            "name": "Product To Delete",
            "sku": "DELETE-001",
            "quantity": 5,
            "price": 100.0,
        },
    )

    assert create_response.status_code == 201
    product_id = create_response.json()["id"]

    delete_response = client.delete(f"/products/{product_id}")
    assert delete_response.status_code == 204

    get_response = client.get(f"/products/{product_id}")
    assert get_response.status_code == 404


def test_delete_product_with_history_is_rejected(client):
    create_response = client.post(
        "/products/",
        json={
            "name": "Product With History",
            "sku": "DELETE-002",
            "quantity": 10,
            "price": 200.0,
        },
    )

    assert create_response.status_code == 201
    product_id = create_response.json()["id"]

    movement_response = client.post(
        "/stock-movements/",
        json={
            "product_id": product_id,
            "movement_type": "stock_in",
            "quantity": 5,
            "reason": "Test history",
        },
    )

    assert movement_response.status_code == 201

    delete_response = client.delete(f"/products/{product_id}")
    assert delete_response.status_code == 409

    get_response = client.get(f"/products/{product_id}")
    assert get_response.status_code == 200


def test_low_stock_endpoint(client):
    client.post(
        "/products/",
        json={
            "name": "Low Stock Product",
            "sku": "LOW-001",
            "quantity": 3,
            "price": 100.0,
        },
    )

    client.post(
        "/products/",
        json={
            "name": "Healthy Stock Product",
            "sku": "HIGH-001",
            "quantity": 20,
            "price": 100.0,
        },
    )

    response = client.get("/products/low-stock")

    assert response.status_code == 200

    products = response.json()
    product_names = [product["name"] for product in products]

    assert "Low Stock Product" in product_names
    assert "Healthy Stock Product" not in product_names

def test_sales_summary(client):
    product_response = client.post(
        "/products/",
        json={
            "name": "Summary Test Product",
            "sku": "SUMMARY-001",
            "quantity": 20,
            "price": 100.0,
        },
    )

    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    first_sale = client.post(
        "/sales/",
        json={
            "product_id": product_id,
            "quantity": 2,
            "payment_method": "cash",
        },
    )
    assert first_sale.status_code == 201

    second_sale = client.post(
        "/sales/",
        json={
            "product_id": product_id,
            "quantity": 3,
            "payment_method": "cash",
        },
    )
    assert second_sale.status_code == 201

    response = client.get("/sales/summary")

    assert response.status_code == 200

    summary = response.json()
    print("Sales summary resposne: ", summary)
    assert summary["total_sales"] == 2
    assert summary["units_sold"] == 5
    assert summary["total_revenue"] == 500.0

def test_update_product_rejects_duplicate_sku(client):
    first_response = client.post(
        "/products/",
        json={
            "name": "First Product",
            "sku": "SKU-FIRST",
            "quantity": 10,
            "price": 100.0,
        },
    )

    second_response = client.post(
        "/products/",
        json={
            "name": "Second Product",
            "sku": "SKU-SECOND",
            "quantity": 5,
            "price": 200.0,
        },
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 201

    second_id = second_response.json()["id"]

    update_response = client.patch(
        f"/products/{second_id}",
        json={"sku": "SKU-FIRST"},
    )

    assert update_response.status_code == 409

    product_response = client.get(f"/products/{second_id}")
    assert product_response.status_code == 200
    assert product_response.json()["sku"] == "SKU-SECOND"


def test_stock_movement_history(client):
    product_response = client.post(
        "/products/",
        json={
            "name": "Movement History Product",
            "sku": "HISTORY-001",
            "quantity": 10,
            "price": 100.0,
        },
    )

    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    stock_in_response = client.post(
        "/stock-movements/",
        json={
            "product_id": product_id,
            "movement_type": "stock_in",
            "quantity": 5,
            "reason": "New delivery",
        },
    )
    assert stock_in_response.status_code == 201

    stock_out_response = client.post(
        "/stock-movements/",
        json={
            "product_id": product_id,
            "movement_type": "stock_out",
            "quantity": 3,
            "reason": "Damaged goods",
        },
    )
    assert stock_out_response.status_code == 201

    history_response = client.get("/stock-movements/")
    assert history_response.status_code == 200

    movements = history_response.json()
    product_movements = [
        movement
        for movement in movements
        if movement["product_id"] == product_id
    ]

    assert len(product_movements) == 2
    assert any(
        movement["movement_type"] == "stock_in"
        and movement["quantity"] == 5
        for movement in product_movements
    )
    assert any(
        movement["movement_type"] == "stock_out"
        and movement["quantity"] == 3
        for movement in product_movements
    )

def test_sales_history(client):
    product_response = client.post(
        "/products/",
        json={
            "name": "Sales History Product",
            "sku": "SALES-HISTORY-001",
            "quantity": 15,
            "price": 120.0,
        },
    )

    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    sale_response = client.post(
        "/sales/",
        json={
            "product_id": product_id,
            "quantity": 4,
            "payment_method": "cash",
        },
    )

    assert sale_response.status_code == 201

    history_response = client.get("/sales/")
    assert history_response.status_code == 200

    sales = history_response.json()
    product_sales = [
        sale for sale in sales
        if sale["product_id"] == product_id
    ]

    assert len(product_sales) == 1
    assert product_sales[0]["quantity"] == 4
    assert product_sales[0]["unit_price"] == 120.0
    assert product_sales[0]["total_amount"] == 480.0

def test_create_product_rejects_negative_price(client):
    response = client.post(
        "/products/",
        json={
            "name": "Invalid Price Product",
            "sku": "INVALID-PRICE-001",
            "quantity": 10,
            "price": -50.0,
        },
    )

    assert response.status_code == 422

def test_create_product_rejects_negative_quantity(client):
    response = client.post(
        "/products/",
        json={
            "name": "Invalid Quantity Product",
            "sku": "INVALID-QTY-001",
            "quantity": -5,
            "price": 100.0,
        },
    )

    assert response.status_code == 422

def test_stock_movement_rejects_negative_quantity(client):
    product_response = client.post(
        "/products/",
        json={
            "name": "Movement Validation Product",
            "sku": "MOVEMENT-VALID-001",
            "quantity": 10,
            "price": 100.0,
        },
    )

    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    movement_response = client.post(
        "/stock-movements/",
        json={
            "product_id": product_id,
            "movement_type": "stock_in",
            "quantity": -3,
            "reason": "Invalid quantity test",
        },
    )

    assert movement_response.status_code == 422

    product_after = client.get(f"/products/{product_id}")
    assert product_after.status_code == 200
    assert product_after.json()["quantity"] == 10

def test_sale_rejects_non_positive_quantity(client):
    product_response = client.post(
        "/products/",
        json={
            "name": "Sale Validation Product",
            "sku": "SALE-VALID-001",
            "quantity": 10,
            "price": 100.0,
        },
    )

    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    for quantity in [0, -2]:
        sale_response = client.post(
            "/sales/",
            json={
                "product_id": product_id,
                "quantity": quantity,
                "payment_method": "cash",
            },
        )

        assert sale_response.status_code == 422

    product_after = client.get(f"/products/{product_id}")
    assert product_after.status_code == 200
    assert product_after.json()["quantity"] == 10