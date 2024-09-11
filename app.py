from flask import Flask, render_template, jsonify, request
import requests
import re

app = Flask(__name__)

# Default configuration
config = {
    'URL': "",
    'auto_fetch': False,
    'interval': 60
}

def extract_number(value):
    return re.sub(r'[^\d]', '', value)

def format_date_time(date_time_str):
    date_match = re.search(r"(\d{4}-\d{2}-\d{2})", date_time_str)
    time_match = re.search(r"<i>(\d{2}:\d{2}:\d{2}) WIB<\/i>", date_time_str)
    return f"{date_match.group(1)}/{time_match.group(1)}" if date_match and time_match else "N/A/N/A"

def parse_item(item):
    date_time = format_date_time(item[1].strip())
    type_ = re.sub(r'<.*?>', '', item[2]).strip()
    src_acc_name = re.search(r'readonly>(.*?)</textarea>', item[4])
    src_acc_name = src_acc_name.group(1) if src_acc_name else "TOP UP"
    total = extract_number(re.search(r'<b>Rp\. (.*?)</b>', item[3]).group(1) if re.search(r'<b>Rp\. (.*?)</b>', item[3]) else "")
    orderid = re.search(r' - (\d{16,})$', item[4])
    orderid = orderid.group(1).strip() if orderid else ""

    return {
        'date': date_time,
        'type': type_,
        'orderid': orderid,
        'src_acc_name': src_acc_name,
        'total': total,
        'user_name': '',
        'status': ''
    }

def fetch_data():
    """Fetch data from the external API and return it as a list of dictionaries."""
    try:
        response = requests.get(config['URL'])
        response.raise_for_status()
        data = response.json().get("data", [])
        
        rows = []
        existing_orderids = set()
        for item in data:
            parsed_item = parse_item(item)
            orderid = parsed_item.get('orderid')
            if orderid and orderid not in existing_orderids:
                rows.append(parsed_item)
                existing_orderids.add(orderid)
                
        return rows
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/data')
def data():
    data = fetch_data()
    return jsonify(data)

@app.route('/update_settings', methods=['GET', 'POST'])
def update_settings():
    if request.method == 'POST':
        settings = request.json
        config['URL'] = settings.get('url', config['URL'])
        config['auto_fetch'] = settings.get('autoFetch', config['auto_fetch'])
        config['interval'] = int(settings.get('interval', config['interval']))
    
    return jsonify({
        'url': config['URL'],
        'autoFetch': config['auto_fetch'],
        'interval': config['interval']
    })

if __name__ == '__main__':
    app.run(debug=True)
