import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { Map, TileLayer, Marker } from 'react-leaflet';
import axios from 'axios';
import { LeafletMouseEvent } from 'leaflet';
import './styles.css';
import api from '../../services/api';
import Dropzone from '../../components/Dropzone';

import logo from '../../assets/logo.svg';

// estado para array e objeto: manualmente informar o tipo da variavel

interface Item {
  id: number,
  title: string,
  image_url: string,
}

interface IBGEUfResponse {
  sigla: string,
}

interface IBGECityResponse {
  nome: string,
}

const CreatePoint = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [ufs, setUfs] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedUf, setSelectedUf] = useState('0');
  const [selectedCity, setSelectedCity] = useState('0');
  const [selectedPosition, setSelectedPosition] = useState<[number, number]>([0,0]);
  const [initialPosition, setInitialPosition] = useState<[number, number]>([0,0]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
  });
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectedFile, setSelectedFile] = useState<File>();

  const history = useHistory();

  // Função que vai chamar o nosso backend para carregar os dados
  useEffect(() => {
    api.get('items').then(response => {
      setItems(response.data);
    })
  }, []);

  // função que vai chamar a API de UF
  useEffect(() => {
    axios.get<IBGEUfResponse[]>('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome').then(response => {
      const ufInitials = response.data.map(uf => uf.sigla);

      setUfs(ufInitials);
    })
  }, []);

  // função que vai chamar a API de cidades de acordo com a UF selecionada
  useEffect(() => {
    // carregar as cidades sempre que a UF mudar
    if (selectedUf === '0') {
      return;
    }

    axios.get<IBGECityResponse[]>(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUf}/municipios?orderBy=nome`)
      .then(response => {
        const cityNames = response.data.map(city => city.nome);

        setCities(cityNames);
      })
  }, [selectedUf]);

  // Função que vai gerar a localização atual do usuário e salvar no estado
  useEffect(()=> {
    // função que carrega a localização atual do usuario
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude } = position.coords;

      setInitialPosition([latitude, longitude]);
    })
  }, []);

  // função que vai guardar o valor do UF que for selecionado
  function handleSelectUf(event: ChangeEvent<HTMLSelectElement>) {
    const uf = event.target.value;

    setSelectedUf(uf);
  }

  // função que vai guardar o valor da cidade que for selecionada 
  function handleSelectCity(event: ChangeEvent<HTMLSelectElement>) {
    const city = event.target.value;

    setSelectedCity(city);
  }

  // Função para lidar com o clique do usuário no mapa
  function handleMapClick(event: LeafletMouseEvent){
    setSelectedPosition([
      event.latlng.lat,
      event.latlng.lng
    ]);
    
  }

  // Função que vai guardar o que for digitado nos inputs
  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setFormData({ ...formData, [name]: value });
  }

  // função para selecionar os itens de coleta
  function handleSelectItem(id: number) {
    // salvo na variavel alreadySelected -1 se o item não existir no estado ou numero positivo, se existir
    const alreadySelected = selectedItems.findIndex(item => item === id);

    // se caso o item ja existir no estado, eu retiro ele do estado
    if (alreadySelected >= 0) {
      const filteredItems = selectedItems.filter(item => item !== id);

      setSelectedItems(filteredItems);
    } else {
      // se ele não existir no estado, eu coloco ele lá
      setSelectedItems([ ...selectedItems, id ]);
    }
    
  }

  // função para criar o point lá no backend
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    
    const { name, email, whatsapp } = formData;
    const uf = selectedUf;
    const city = selectedCity;
    const [latitude, longitude] = selectedPosition;
    const items = selectedItems;

    // criamos um novo multipartFrom para enviar a imagem 
    const data = new FormData();

    // enviamos os dados para o backend
    data.append('name', name);
    data.append('email', email);
    data.append('whatsapp', whatsapp);
    data.append('uf', uf);
    data.append('city', city);
    data.append('latitude', String(latitude));
    data.append('longitude', String(longitude));
    data.append('items', items.join(','));
    if (selectedFile) {
      data.append('image', selectedFile);
    }

    await api.post('points', data);

    alert('Ponto de coleta criado!');

    history.push('/');
  }

  return (
    <div id="page-create-point">
      <header>
        <img src={logo} alt="Ecoleta"/>

        <Link to="/">
          <FiArrowLeft />
          Voltar para a home
        </Link>
      </header>

      <form onSubmit={handleSubmit}>
        <h1>Cadastro do <br/> ponto de coleta</h1>

        <Dropzone onFileUploaded={setSelectedFile}/>

        <fieldset>
          <legend>
            <h2>Dados</h2>
          </legend>

          <div className="field">
            <label htmlFor="name">Nome da entidade</label>

            <input 
              type="text" 
              name="name" 
              id="name"
              onChange={handleInputChange}
            />
          </div>

          <div className="field-group">
            <div className="field">
              <label htmlFor="email">E-mail</label>

              <input 
                type="email" 
                name="email" 
                id="email"
                onChange={handleInputChange}
              />
            </div>

            <div className="field">
              <label htmlFor="whatsapp">Whatsapp</label>

              <input 
                type="text" 
                name="whatsapp" 
                id="whatsapp"
                onChange={handleInputChange}
              />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>
            <h2>Endereço</h2>
            <span>Selecione o endereço no mapa</span>
          </legend>

          <Map center={initialPosition} zoom={15} onClick={handleMapClick}>
            <TileLayer
              attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker position={selectedPosition} />
          </Map>

          <div className="field-group">
            <div className="field">
              <label htmlFor="uf">Estado (UF)</label>

              <select 
                name="uf" 
                id="uf" 
                value={selectedUf} 
                onChange={handleSelectUf}
              >
                <option value="0">Seleecione uma UF</option>
                {ufs.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="city">Cidade</label>
              
              <select 
                name="city" 
                id="city" 
                value={selectedCity} 
                onChange={handleSelectCity}
              >
                <option value="0">Seleecione uma cidade</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>
            <h2>Ítens de coleta</h2>
            <span>Selecione um ou mais itens abaixo</span>
          </legend>

          <ul className="items-grid">
            {items.map(item => (
              <li 
                key={item.id} 
                onClick={() => handleSelectItem(item.id)}
                // selectedItems.includes(item.id) => significa se o item clicado ja estiver sido incluido no state
                className={selectedItems.includes(item.id) ? 'selected' : ''}  
              >
                <img src={item.image_url} alt="Teste"/>
                <span>{item.title}</span>
              </li>
            ))}
          </ul>
        </fieldset>

        <button type="submit">
          Cadastrar ponto de coleta
        </button>
      </form>
    </div>
  )
}

export default CreatePoint;