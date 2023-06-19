var axios = require('axios');

const getCountryCities = (req, res, next) => {
    axios
      .get('https://countriesnow.space/api/v0.1/countries')
      .then(response => {
        req.countries = response.data.data.map(item => item.country);
        next();
      })
      .catch(err => {
        console.log(err);
        err.response.status === 404 ? alert(`The country doesn't exist.`) : alert('Server error! Sorry.');
        next();
      });
  };
  
  module.exports = getCountryCities;