from app import app

if __name__ == "__main__":
    # Disable werkzeug logging
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)