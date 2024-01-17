DROP TABLE IF EXISTS Customers;
DROP TABLE IF EXISTS Products;
DROP TABLE IF EXISTS Transactions;
DROP TABLE IF EXISTS transaction_detail;
-------------
CREATE TABLE Customers (
    customer_id SERIAL PRIMARY KEY,
    First_name VARCHAR(20),
    Last_name VARCHAR(20),
    Phone VARCHAR(20)
);
INSERT INTO Customers (First_name, Last_name, Phone)
VALUES ('Bob', 'Smith', '832-123-4089'),
    ('Billy', 'Parker', '346-512-5101'),
    ('Hung', 'Trinh', '271-532-5410'),
    ('Hao', 'Truong', '942-625-7452'),
    ('Danny', 'Le', '951-741-5626'),
    ('Moataz ', 'Altaweel', '832-541-5414'),
    ('Carlos', 'Ordonez', '713-415-5623');
---------------------------
CREATE TABLE Products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(20),
    product_type VARCHAR(20),
    price INT,
    stocks INT
);
INSERT INTO Products (product_name, product_type, price, stocks)
VALUES ('Burger', 'main', 12, 10),
    ('Pasta', 'main', 14, 10),
    ('Steak', 'main', 23, 10),
    ('Nacho', 'apps', 12, 10),
    ('Calamari', 'apps', 15, 10),
    ('Onion Ring', 'apps', 14, 10),
    ('Ice Cream', 'dessert', 11, 10),
    ('Cheese Cake', 'dessert', 15, 10);
--------------------------
CREATE TABLE Transactions (
    trans_id SERIAL PRIMARY KEY,
    customer_id INT,
    trans_date DATE,
    total INT,
    FOREIGN KEY (customer_id) REFERENCES Customers (customer_id)
);
--------------------------
CREATE TABLE transaction_detail (
    trans_id INT,
    product_id INT,
    quantity INT,
    PRIMARY KEY (trans_id, product_id),
    FOREIGN KEY (product_id) REFERENCES Products (product_id),
    FOREIGN KEY (trans_id) REFERENCES Transactions (trans_id)
);
--INSERT INTO transaction_detail(trans_id,product_id,quantity) VALUES (1,1,2)
CREATE TABLE Cart (
    customer_id INT,
    product_id INT,
    quantity INT,
    PRIMARY KEY (customer_id, product_id),
    FOREIGN KEY (customer_id) REFERENCES Customers (customer_id),
    FOREIGN KEY (product_id) REFERENCES Products (product_id)
);