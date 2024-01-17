//Download nodejs(https://nodejs.org/en/download)
//Run following command to install libraries: npm install express pg
//Alter ./creds.json with your local psql credentials
//Start server using command: node hw2.js
//Open browser and go to http://localhost:3000/;


const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;

const creds = require('./creds.json');
const pool = new Pool(creds);
app.use(express.urlencoded({ extended: true }));

//the main webpage
app.get('/', async (req, res) => {
    let customerId = req.query.customerId;//get customer_id from the URL
    let transactionsHtml = "";//tranasaction info to display
    let detailHtml = "";//detail info to display
    let totalPrice = 0;
    let customerName = "";
    let detail = req.query.detail;//get the "detail" value from URl if true then detail button was click
    let transId = req.query.transId;//get transaction ID from url

    if (customerId && customerId != 'undefined') {//if customer_id is valid and not undefinedg

        if (detail) {//if detail == true run this
            //get only rows from tables products and trans_detail joining on product_id with the trans_id = transId from url
            let detail_query = await pool.query(`SELECT * FROM transaction_detail t JOIN Products p ON t.product_id = p.product_id WHERE t.trans_id = $1`,[transId]);
            if (detail_query.rows.length > 0) {
                detailHtml = detail_query.rows.map(data => {
                    return `<li>${data.product_name} | Quantity: ${data.quantity} | $${data.quantity * data.price}</li>`; //return the product name,quanity, and price in list to print in the webpage
                }).join('');
            }
        }

        // showing detail of transaction (trans_id, customer id, date, total)
        try {
            const result = await pool.query(`
                SELECT t.*, c.First_name, c.Last_name, c.Phone
                FROM transactions t 
                INNER JOIN Customers c ON t.customer_id = c.customer_id
                WHERE t.customer_id = $1
            `, [customerId]);//get only rows from tables customers and transactions joining on customer_id where customer_id == current customer_id entered
            const user = await pool.query(`
            SELECT * FROM Customers WHERE customer_id = $1
            `,[customerId]);//query to get customer name
            if (result.rows.length > 0) {//if the result query table is not empty
                customerName = result.rows[0].first_name + " " + result.rows[0].last_name;//get the customer name
                transactionsHtml = result.rows.map(row => {//transactionHtml return html code that display all the transactions for that customerId
                    totalPrice += row.product_price;
                    return `<div style="display:flex; justify-content:center; align-items: center; gap: 10px;">
                     <p>Transaction ID: ${row.trans_id}, Customer ID: ${row.customer_id}, Date: ${row.trans_date}, Total: $${row.total}</p>
                     <form action="/" method="GET">
                     <input type="hidden" name="detail" id="detail" value="true"></input>
                     <input type="hidden" name="customerId" id="customerId" value="${customerId}"></input>
                     <input type="hidden" name="transId" id="transId" value="${row.trans_id}"></input>
                     <button type="submit">Details</button>
                     </form>
                     </div>
                     ${transId == row.trans_id ? `<ul>${detailHtml}</ul>` : `<p></p>`}`;
                }).join('');
            }
            else if (result.rows.length == 0 && user.rows.length == 1) {//if customer_id is valid but no transactions
                 customerName = user.rows[0].first_name + " " + user.rows[0].last_name
                 transactionsHtml = `<p>No Transactions!</p>`;
            }
            else {//customer_id is not valid
                customerId = "undefined";
                transactionsHtml = `<p>No user with that ID!</p>`
            }
        } catch (err) {
            console.log("error")
            return res.status(500).send("Error: " + err.message);
        }

    }

    
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Transactions</title>
        </head>
        <body>
        <div style="display: flex; justify-content: center; gap: 20px; width: 100%; align-items: center;">
            <form action="/" method="GET" style="background-color: lightblue; padding: 5px; border-radius: 5px">
                <label for="customerId">Enter Existing Customer ID:</label>
                <input type="number" name="customerId" id="customerId" required>
                <button type="submit">Get Transactions</button>
                <a href="/signup">Sign up!</a>
            </form>
            </div>
            <div style="display: flex; justify-content: center; gap: 20px; width: 100%; align-items: center; flex-direction: column;">
            <div style="background-color: lightblue; padding: 10px; border-radius: 5px; margin: 15px;">
            ${customerName ? `<h2>Welcome back, ${customerName}!</h2>` : '<h2>Enter your Customer ID to view your transactions.</h2>'}
            
                <h3>Transactions:</h3>
                ${transactionsHtml}
            </div>
            <a href="/products?customerId=${customerId}">Menu</a>
            <a href="/others">Stocks/View Tables</a>
            </div>
        </body>
        </html>
    `);
});



app.get('/others', async (req,res) => {

    let stock = false;
    let view = false;

    let prod_name = req.query.prod_name;
    let quantity = req.query.quantity;
    let table_name = req.query.table_name;
    stock = req.query.stock;
    view = req.query.view;
    let tableHTML = "";
    // show product names
    let product = await pool.query(`SELECT product_name FROM Products`);
    let optionHtml = product.rows.map(product => `<option value="${product.product_name}">${product.product_name}</option>`).join('');

    if (stock) {
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // adding stock to products
        try {
            await pool.query('BEGIN');
            await pool.query(`UPDATE Products SET stocks = stocks + $1 WHERE product_name = $2`,[parseInt(quantity,10),prod_name]);
            await pool.query('COMMIT');
        }
        catch (error) {
            await pool.query('ROLLBACK');
            return res.status(500).send("Transaction ereeeeror(cart): " + error.message);
        }
    }

    if (view) {
        try {
            const table_result = await pool.query(`SELECT * FROM ${table_name} LIMIT 10`);
            const tableData = table_result.rows;

            // Generate HTML table dynamically
            if (tableData.length > 0) {
                tableHTML = "<h2>Table Contents (Max 10 rows)</h2><table border='1'><tr>";

                // Generate table headers
                for (const column in tableData[0]) {
                    tableHTML += `<th>${column}</th>`;
                }

                tableHTML += "</tr>";

                // Generate table rows
                for (const row of tableData) {
                    tableHTML += "<tr>";
                    for (const column in row) {
                        tableHTML += `<td>${row[column]}</td>`;
                    }
                    tableHTML += "</tr>";
                }

                tableHTML += "</table>";
            } else {
                tableHTML = `<p>No data in table ${table_name}</p>`;
            }
        } catch (error) {
            return res.status(500).send("Transaction error(cart): " + error.message);
        }
    }
    


    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Transactions</title>
        </head>
        <body>
        <a href="/">Go Back!</a>
        <div style="display: flex; flex-direction: column; justify-content:center; align-items: center;">
        <h2>Stock Items</h2>
        <form action="/others" method="GET" style="display:flex; flex-direction: column;gap: 5px">
                    <input type="hidden" name="stock" id="stock" value="true" required>
                    <label for="prod_name">Enter Product name:</label>
                    <select id="prod_name" name="prod_name">${optionHtml}</select>
                    <label for="quantity">Quantity:</label>
                    <input type="text" name="quantity" id="quantity" required>
                    <button type="submit">Add to Stock</button>
        </form>
        <h2>View table contents</h2>
        <form action="/others" method="GET" style="display:flex; flex-direction: column;gap: 5px;">
                    <input type="hidden" name="view" id="view" value="true" required>
                    <label for="table_name">Select a table:</label>
                    <select id="table_name" name="table_name">
                    <option value="Customers">Customers</option>
                    <option value="Products">Products</option>
                    <option value="Transactions">Transactions</option>
                    <option value="transaction_detail">Transaction details</option>
                    <option value="Cart">Shopping Cart</option>
                    </select>
                    <button type="submit">View</button>
        </form>
        ${tableHTML}
        </div>
        </body>
        </html>
    `);
});




//function to set the number of quantity to purchase base on how many are left in stock for that product
function set_quantity (max) {
    let options = '';
  for (let i = 1; i <= max; i++) {
    options += `<option value="${i}">${i}</option>`;
  }
  return options;
}


//the menu webpage
app.get('/products', async (req,res) => {
    let customerId = "";
    let total = 0;
    let valid_user = true;
    const productId = req.query.productId;//get product_id from url
    const quantity = req.query.quantity;//get quanity from url
    let temp = req.query.customerId;//get customerId from url

    //if customer_id is undefined(not in the database)
    if (temp == 'undefined') {
        valid_user = false;
        console.log("not valid");
    }
    else if (customerId != temp && temp != 'undefined') {
        customerId = temp;
        console.log("valid");
    }
    let clear = false;//boolean for if the clean button is clicked
    clear = req.query.clear;
    let buy = req.query.purchase;

    let shopHtml = "";
    let totalHtml = "";
    let errorHtml = "";
    let user = "";

    console.log(customerId);

    //if the customer_id is valid(ID is in the database)
if (valid_user) {
    const user_name = await pool.query(`SELECT * FROM Customers WHERE customer_id = $1`,[customerId]);
    user = user_name.rows[0].first_name;
    //'INSERT INTO Customers (First_name, Last_name, Phone) VALUES ($1, $2, $3) RETURNING customer_id';

    //if there a productId in the url(which mean the user add an item to the shopping cart)
    if (productId) {
        try {

            const query = 'SELECT * FROM Cart c JOIN Products p ON c.product_id = p.product_id WHERE c.customer_id = $1 AND c.product_id = $2';//query to see the user shoppping cart table using their ID
            let result = await pool.query(query,[customerId,productId]);
            const rows = result.rows;
            console.log(quantity);
            if (rows.length > 0 && parseInt(rows[0].quantity,10) + parseInt(quantity,10) <= parseInt(rows[0].stocks,10)) {
                //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                //if the user already has that item(productId) in the Cart then add to that quanity
                console.log("update cart");
                console.log(rows[0].product_id);
                //begin transaction query
                await pool.query('BEGIN');
                await pool.query(`UPDATE Cart SET quantity = quantity + $1 WHERE customer_id = $2 AND product_id = $3`,[quantity,rows[0].customer_id,rows[0].product_id]);
                //commit query
                await pool.query('COMMIT');
            }
            else if(rows.length == 0){
                ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                //if the item(productId) is not in the Cart yet insert it into the Cart table
                console.log("add to cart");
                //begin transaction query
                await pool.query('BEGIN');
                await pool.query(`INSERT INTO Cart(customer_id,product_id,quantity) VALUES($1,$2,$3)`,[customerId,productId,quantity]);
                //commit query
                await pool.query('COMMIT');
            }
            else {//can't add more of that item(productId) if there not enough left in stock
                errorHtml = `<p>Can't add more, only ${rows[0].quantity} ${rows[0].product_name} left in stock!</p>`;
            }
        }
        catch (error) {
            await pool.query('ROLLBACK');
            return res.status(500).send("Transaction ereeeeror(cart): " + error.message);
        }
    }

    function showConfirmation() {
        const isConfirmed = window.confirm("Are you sure you want to make the purchase?");
        
        // If the user clicks "OK" in the confirmation dialog, the form will be submitted
        return isConfirmed;
    }

    //if the buy button is clicked
    if (buy) {
        //this result table is empty only if there enough stocks left for all the items in the shopping cart to be purchase for that user
        let enough_stock = await pool.query(`SELECT * FROM Cart c JOIN Products p ON c.product_id = p.product_id WHERE customer_id = $1 AND p.stocks - c.quantity < 0;`,[customerId]);
        let not_empty = await pool.query(`SELECT * FROM Cart WHERE customer_id = $1`,[customerId]);
        if (enough_stock.rows.length == 0 && not_empty.rows.length != 0) {
            try {
                

                const currentDate = new Date();
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1; // Note: Month is 0-based, so add 1 to get the actual month (1-12).
                const day = currentDate.getDate();
                let trans_total = await pool.query(`SELECT SUM(c.quantity * p.price) FROM Cart c INNER JOIN Products p  ON c.product_id = p.product_id WHERE c.customer_id = $1;`,[customerId]);//get the sum total of the shopping cart using query
                let total_result = trans_total.rows[0].sum;
                console.log(total_result);
                let date = year + "-" + month + "-" + day;//combine the month,day, and year
                console.log(year + "-" + month + "-" + day);
                await pool.query('BEGIN');
                let trans = await pool.query(`INSERT INTO Transactions (customer_id,trans_date,total) VALUES($1,$2,$3) RETURNING trans_id`,[customerId,date,total_result]);//insert the customer_id,date, and total into the transaction table, returning created trans_id
                await pool.query('COMMIT');
                if (trans.rows.length > 0) {
                    let t_id = trans.rows[0].trans_id;
                    console.log(t_id);
                    let cart_items = pool.query(`SELECT * FROM Cart WHERE customer_id = $1`,[customerId]);
                    (await cart_items).rows.map(async rows => {
                        // add new transaction to customer's history
                        await pool.query('BEGIN');
                        await pool.query(`INSERT INTO transaction_detail(trans_id,product_id,quantity) VALUES($1,$2,$3)`,[t_id,rows.product_id,rows.quantity]);
                        await pool.query(`UPDATE Products SET stocks = stocks - $1 WHERE product_id = $2 AND stocks > 0`,[parseInt(rows.quantity,10),rows.product_id]);
                        await pool.query('COMMIT');
                    });
                }
                clear = true;
                
            }
            catch(error) {
                await pool.query('ROLLBACK');
                return res.status(500).send("Transaction error(buy): " + error.message);
            }
        }
        else {
            if (enough_stock.rows.length != 0) {
                let no_stock_item = enough_stock.rows[0].product_name;
                errorHtml = `<p>One of the items don't have enough in stock(${no_stock_item})</p>`;
            }
            else {
                errorHtml = `<p>Cart is empty!</p>`;
            }
        }
    }
    if (clear) {
        try {
            result = await pool.query(`SELECT * FROM Cart WHERE customer_id = $1`,[customerId]);
            if (result.rows.length > 0) {
                await pool.query(`DELETE FROM Cart WHERE customer_id = $1`,[customerId]);
            }
            clear = false;

        }
        catch(error) {
            return res.status(500).send("Transaction error(clear): " + error.message);
        }
    }

    try {
        const shop_cart = await pool.query(`SELECT * FROM Products p JOIN Cart c ON p.product_id = c.product_id WHERE customer_id = $1`,[customerId]);
        if (shop_cart.rows.length > 0) {
            shopHtml = shop_cart.rows.map(data => {
                total += data.price * data.quantity;
                return `<li>Items: ${data.product_name} | Quantity: ${data.quantity} | Price: $${data.price * data.quantity}</li>`;
            }).join('');
            totalHtml = `Total: $${total}`;
        }
    }
    catch (error) {
        return res.status(500).send("Transaction error(cart): " + error.message);
    }

}



    try {
        // using sql queries to display menu
        const main_food = await pool.query(`SELECT * FROM Products WHERE product_type = 'main'`);
        const app_food = await pool.query(`SELECT * FROM Products WHERE product_type = 'apps'`);
        const dessert_food = await pool.query(`SELECT * FROM Products WHERE product_type = 'dessert'`);
        if (main_food.rows.length > 0) {
            mainHtml = main_food.rows.map(data => {
                return `<div data-id="${data.product_id}" style="display:flex; flex-direction: column; justify-content: center; align-items: center; background-color: lightyellow; padding: 10px; border-radius: 10px;">
                <div>${data.product_name}</div>
                <div>Price: $${data.price}</div>
                <form action="/products" method="GET">
                <input type="hidden" name="productId" id="productId"  value="${data.product_id}">
                <input type="hidden" name="customerId" id="customerId"  value="${customerId}">
                ${valid_user ? (data.stocks <= 0 ? `<p>Out of Stocks!</p>` 
                :`<div style="display: flex; height: 30px; justify-content: center; align-items: center; gap: 10px"><p>Stocks: </p><select name="quantity" id="quantity" required>${set_quantity(data.stocks)}</select> </div> <button id="button" style="margin: 5px;">Add to Cart</button>`) 
                : `<p>Sign in to purchase!</p>`}
                </form>
                </div>`
            }).join('');
        }
        if (app_food.rows.length > 0) {
            appHtml = app_food.rows.map(data => {
                return `<div data-id="${data.product_id}" style="display:flex; flex-direction: column; justify-content: center; align-items: center; background-color: lightgray; padding: 10px; border-radius: 10px;">
                <div>${data.product_name}</div>
                <div>Price: $${data.price}</div>
                <form action="/products" method="GET">
                <input type="hidden" name="productId" id="productId"  value="${data.product_id}">
                <input type="hidden" name="customerId" id="customerId"  value="${customerId}">
                ${valid_user ? (data.stocks <= 0 ? `<p>Out of Stocks!</p>` 
                :`<div style="display: flex; height: 30px; justify-content: center; align-items: center; gap: 10px"><p>Stocks: </p><select name="quantity" id="quantity" required>${set_quantity(data.stocks)}</select> </div> <button id="button" style="margin: 5px;">Add to Cart</button>` ) 
                : `<p>Sign in to purchase!</p>`}
                </form>
                </div>`
            }).join('');
        }
        if (dessert_food.rows.length > 0) {
            dessertHtml = dessert_food.rows.map(data => {
                return `<div data-id="${data.product_id}" style="display:flex; flex-direction: column; justify-content: center; align-items: center; background-color: cyan; padding: 10px; border-radius: 10px;">
                <div>${data.product_name}</div>
                <div>Price: $${data.price}</div>
                <form action="/products" method="GET">
                <input type="hidden" name="productId" id="productId"  value="${data.product_id}">
                <input type="hidden" name="customerId" id="customerId"  value="${customerId}">
                ${valid_user ? (data.stocks <= 0 ? `<p>Out of Stocks!</p>` 
                :`<div style="display: flex; height: 30px; justify-content: center; align-items: center; gap: 10px"><p>Stocks: </p><select name="quantity" id="quantity" required>${set_quantity(data.stocks)}</select> </div> <button id="button" style="margin: 5px;">Add to Cart</button>` ) 
                : `<p>Sign in to purchase!</p>`}
                </form>
                </div>`
            }).join('');
        }
    }
    catch (error) {
        return res.status(500).send("Error: " + error.message);
    }



    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title> PRODUCTS</title>
    </head>
    <body style="display: flex; justify-content: center;gap: 15px;">
    <div style="display: flex; justify-content: center; align-items: center; flex-direction: column; font-size: 20px; margin: 15px;">
    <div style="display:flex; justify-content: center; align-items:center;gap: 20px;"><a href="/?customerId=${customerId}" ><-- Go back</a>${user ? `<h3>User: ${user} | ID: ${customerId}</h3>` : `<h3>Not sign in!</h3>`}</div>

    <h1>Menu</h1>
    <h2 style="border-bottom: 2px solid #000;">Main Course</h2>
    <div style="display: flex; gap: 20px;">
    ${mainHtml}
    </div>
    <h2 style="border-bottom: 2px solid #000;">Appetizers</h2>
    <div style="display: flex; gap: 20px;">
    ${appHtml}
    </div>
    <h2 style="border-bottom: 2px solid #000;">Desserts</h2>
    <div style="display: flex; gap: 20px;">
    ${dessertHtml}
    </div>
    </div>
    <div style="display: flex; flex-direction: column; justify-content: start; align-items: center;">
    <h2>Shopping Cart</h2>
    <ul id="cart-items">
    ${shopHtml ? shopHtml : `<p>Empty!</p>`}
    ${totalHtml ? totalHtml : `<p>Total: $0</p>`}
    </ul>
    <div style="display: flex">
    <form action="/products" method="GET">
        <input type="hidden" name="clear" id="clear"  value="true">
        <input type="hidden" name="customerId" id="customerId"  value="${customerId}">
        ${valid_user ? `<button id="button" style="margin: 5px;">Clear Cart</button>` : `<p></p>`}
    </form>
    <form action="/products" method="GET" onsubmit="${showConfirmation ? 'return confirm(\'Are you sure you want to make the purchase?\')' : 'true'}">
        <input type="hidden" name="purchase" id="purchase"  value="true">
        <input type="hidden" name="customerId" id="customerId"  value="${customerId}">
        ${valid_user ? `<button id="button" style="margin: 5px;">Buy</button>` : `<p></p>`}
    </form>
    </div>
    ${errorHtml ? `${errorHtml}` : `<p></p>`}
    </div>
    </body>
    </html>
    `)


})



app.get('/signup', async (req, res) => {
    // Extract the form data from req.body



        // Display the sign-up form again if the form data is not complete
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title> PRODUCTS</title>
            </head>
            <body style="display: flex; justify-content: center; align-items: center; flex-direction: column; font-size: 20px;">
            <a href="/" style="align-self: start;"><-- Go back</a>
                <div style="display: flex; justify-content: center; gap: 20px; width: 100%; align-items: center;">
                    <form action="/signup" method="POST" style="background-color: lightblue; padding: 5px; border-radius: 5px; display:flex; flex-direction: column; gap: 10px">
                        <label for="fname">Enter First name:</label>
                        <input type="text" name="fname" id="fname" required>
                        <label for="lname">Enter Last name:</label>
                        <input type="text" name="lname" id="lname" required>
                        <label for "phone">Enter Phone Number:</label>
                        <input type="text" name="phone" id="phone" required>
                        <button type="submit">Sign Up</button>
                    </form>
                </div>
            </body>
            </html>
        `);

});

app.post('/signup', async (req, res) => {
    const fname = req.body.fname;
    const lname = req.body.lname;
    const phone = req.body.phone;
    if (fname && lname && phone) {
        try {
            // Define an SQL query to insert the new customer info into database
            await pool.query('BEGIN');
            const insertQuery = 'INSERT INTO Customers (First_name, Last_name, Phone) VALUES ($1, $2, $3) RETURNING customer_id';
            // Use the pool.query function to execute the SQL query
            const result = await pool.query(insertQuery, [fname, lname, phone]);
            const rows = result.rows;
            await pool.query('COMMIT');
            if (rows.length > 0) {
                const id = rows[0].customer_id;
                res.send(`Customer successfully added to the database your ID is ${id}.`);
            }
        } catch (err) {
            await pool.query('ROLLBACK');
            console.error("Error:", err);
            return res.status(500).send("Error: " + err.message);
        }
    } else {
        // Display the sign-up form again if the form data is not complete
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title> PRODUCTS</title>
            </head>
            <body style="display: flex; justify-content: center; align-items: center; flex-direction: column; font-size: 20px;">
                <a href="/" style="align-self: start;"><-- Go back</a>
                <div style="display: flex; justify-content: center; gap: 20px; width: 100%; align-items: center;">
                    <form action="signup/" method="POST" style="background-color: lightblue; padding: 5px; border-radius: 5px; display:flex; flex-direction: column; gap: 10px">
                        <label for="fname">Enter First name:</label>
                        <input type="text" name="fname" id="fname" required>
                        <label for="lname">Enter Last name:</label>
                        <input type="text" name="lname" id="lname" required>
                        <label for="phone">Enter Phone Number:</label>
                        <input type="text" name="phone" id="phone" required>
                        <button type="submit">Sign Up</button>
                    </form>
                </div>
            </body>
            </html>
        `);
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});