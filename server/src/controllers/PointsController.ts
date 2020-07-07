import {Request, Response} from 'express';
import knex from '../database/connection';

class PointsController {
  async show (request: Request, response: Response) {
    // pego o id passado pela url
    const { id } = request.params;

    // procuro no BD pelo registro referente ao ID
    const point = await knex('points').where('id', id).first();

    // Se nada foi encontrado, retorno erro
    if (!point) {
      return response.status(400).json({ message: 'Point not found' });
    }

    // pego os items que tem o mesmo id do meu point
    const items = await knex('items')
      // junto as tabelas items com point_items
      .join('point_items', 'items.id', '=', 'point_items.item_id')
      // onde o id da point_items for igual ao id do point
      .where('point_items.point_id', id)
      // trazendo apenas o titulo dos items
      .select('items.title');

      const serializedPoint = {
          ... point,
          image_url: `http://192.168.2.106:3333/uploads/${point.image}`,
      };

    // retorno o point encontrado
    return response.json({ point: serializedPoint, items });
  }

  async index (request: Request, response: Response) {
    // pego os dados da minha query params
    const { city, uf, items } = request.query;

    // pego o meu items e separo eles onde tiver um virgula, removo os espaços e forço o resultado ser Number
    const parsedItems = String(items)
      .split(',')
      .map(item => Number(item.trim()));

    // busco todos os points
    const points = await knex('points')
      // relacionando com o point_items
      .join('point_items', 'points.id', '=', 'point_items.point_id')
      // onde contenha pelo menos algum dos IDs que estão vindo no meu parsedItems
      .whereIn('point_items.item_id', parsedItems)
      // onde city for igual a cidade que eu recebi no query params
      .where('city', String(city))
      // onde uf é igual ao uf que recebi no query params
      .where('uf', String(uf))
      .distinct()
      // trago todos os points
      .select('points.*');

      const serializedPoints = points.map(point => {
        return {
          ... point,
          image_url: `http://192.168.2.106:3333/uploads/${point.image}`,
        };
      });

    return response.json(serializedPoints);
  }

  async create (request: Request, response: Response) {
    // pego os dados inseridos pelo usuário
    const {
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      city,
      uf,
      items
    } = request.body;
  
    const trx = await knex.transaction();

    const point = {
      image: request.file.filename,
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      city,
      uf
    }
  
    // Insiro na tabela points os dados referentes a essa tabela, salvando na variável insertedIds 
    // o ID do meu point criado
    const insertedIds = await trx('points').insert(point);

    const point_id = insertedIds[0];
  
    // Percorro todos os items que o usuário digitou e vinculo o ID do point em cada um
    const pointItems = items
      .split(',')
      .map((item: string) => Number(item.trim()))
      .map((item_id: number) => {
        return {
          item_id,
          point_id,
        };
      });
  
    // Insiro os dados de id item e id point na tb_point_items
    await trx('point_items').insert(pointItems);

    // digo pro trx que se tudo der certo eu faço de fato a inserção
    await trx.commit();
  
    return response.json({
      id: point_id,
      ...point
    });
  }
}

export default PointsController;